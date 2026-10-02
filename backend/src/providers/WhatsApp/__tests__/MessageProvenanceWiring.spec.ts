import { execFileSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";
import ts from "typescript";

const backendRoot = join(__dirname, "../../../..");
const approvedBase = "65c1ff728ad8f9f401767615af902524f2187466";
const sources = [
  "handlers/handleWhatsappEvents.ts",
  "providers/WhatsApp/Implementations/wwebjs.ts",
  "providers/WhatsApp/Implementations/whaileys.ts",
  "providers/WhatsApp/Implementations/wwebjsReconciliationBridge.ts",
  "services/CloudApiWebhookServices/NormalizeCloudApiWebhook.ts"
];

const withoutProvenance = (text: string): string => {
  const source = ts.createSourceFile(
    "source.ts",
    text,
    ts.ScriptTarget.Latest,
    true
  );
  const transformed = ts.transform(source, [
    context => {
      const visit: ts.Visitor = node => {
        if (
          ts.isImportDeclaration(node) &&
          ts.isStringLiteral(node.moduleSpecifier) &&
          node.moduleSpecifier.text.endsWith("/MessageProvenance")
        ) {
          return undefined;
        }
        if (
          (ts.isPropertyAssignment(node) || ts.isPropertySignature(node)) &&
          node.name &&
          ts.isIdentifier(node.name) &&
          node.name.text === "messageProvenance"
        ) {
          return undefined;
        }
        const visited = ts.visitEachChild(node, visit, context);
        if (
          ts.isObjectLiteralExpression(visited) &&
          visited.properties.length === 1 &&
          ts.isSpreadAssignment(visited.properties[0])
        ) {
          return visited.properties[0].expression;
        }
        return visited;
      };
      return root => ts.visitNode(root, visit) as ts.SourceFile;
    }
  ]);
  try {
    return ts
      .createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed })
      .printFile(transformed.transformed[0] as ts.SourceFile);
  } finally {
    transformed.dispose();
  }
};

describe("MessageProvenance wiring regression", () => {
  it.each(sources)(
    "preserves all R07 operational code after removing only provenance metadata: %s",
    relativePath => {
      const baseline = execFileSync(
        "git",
        ["show", `${approvedBase}:backend/src/${relativePath}`],
        {
          cwd: backendRoot,
          encoding: "utf8"
        }
      );
      const current = readFileSync(
        join(backendRoot, "src", relativePath),
        "utf8"
      );
      expect(withoutProvenance(current)).toBe(withoutProvenance(baseline));
    }
  );

  it("keeps the shared handler's four-argument legacy signature", () => {
    const current = readFileSync(
      join(backendRoot, "src/handlers/handleWhatsappEvents.ts"),
      "utf8"
    );
    const source = ts.createSourceFile(
      "handler.ts",
      current,
      ts.ScriptTarget.Latest,
      true
    );
    const declaration = source.statements
      .filter(ts.isVariableStatement)
      .flatMap(statement => [...statement.declarationList.declarations])
      .find(
        value =>
          ts.isIdentifier(value.name) && value.name.text === "handleMessage"
      );
    if (
      !declaration?.initializer ||
      !ts.isArrowFunction(declaration.initializer)
    ) {
      throw new Error("Expected the existing handleMessage declaration");
    }
    expect(
      declaration.initializer.parameters.map(parameter =>
        parameter.name.getText(source)
      )
    ).toEqual([
      "messagePayload",
      "contactPayload",
      "contextPayload",
      "mediaPayload"
    ]);
    expect(declaration.initializer.parameters[3].questionToken).toBeDefined();
  });

  it("keeps all four direct handler consumer files and no productive R07 invocation", () => {
    const countCalls = (file: string): number => {
      const source = ts.createSourceFile(
        "consumer.ts",
        file,
        ts.ScriptTarget.Latest,
        true
      );
      let count = 0;
      const visit = (node: ts.Node): void => {
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === "handleMessage"
        )
          count += 1;
        ts.forEachChild(node, visit);
      };
      visit(source);
      return count;
    };
    const consumers = [
      "controllers/CloudApiWebhookController.ts",
      "providers/WhatsApp/Implementations/wwebjs.ts",
      "providers/WhatsApp/Implementations/whaileys.ts",
      "providers/WhatsApp/Implementations/wwebjsReconciliationBridge.ts"
    ];
    expect(
      consumers.map(relativePath => {
        const current = readFileSync(
          join(backendRoot, "src", relativePath),
          "utf8"
        );
        expect(current).not.toMatch(/BuildCrmContactIntentService/);
        return countCalls(current);
      })
    ).toEqual([1, 5, 1, 1]);
  });
});

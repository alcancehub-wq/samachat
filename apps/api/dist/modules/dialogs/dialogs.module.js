"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DialogsModule = void 0;
const common_1 = require("@nestjs/common");
const dialogs_controller_1 = require("./dialogs.controller");
const dialogs_service_1 = require("./dialogs.service");
const tags_controller_1 = require("./tags.controller");
const tags_service_1 = require("./tags.service");
const variables_controller_1 = require("./variables.controller");
const variables_service_1 = require("./variables.service");
let DialogsModule = class DialogsModule {
};
exports.DialogsModule = DialogsModule;
exports.DialogsModule = DialogsModule = __decorate([
    (0, common_1.Module)({
        controllers: [dialogs_controller_1.DialogsController, tags_controller_1.DialogTagsController, variables_controller_1.DialogVariablesController],
        providers: [dialogs_service_1.DialogsService, tags_service_1.DialogTagsService, variables_service_1.DialogVariablesService],
    })
], DialogsModule);

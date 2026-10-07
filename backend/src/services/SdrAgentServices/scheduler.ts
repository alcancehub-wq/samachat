import { logger } from "../../utils/logger";

type Runner = (ticketId: number) => Promise<void>;

// Agrupa mensagens picadas e garante UMA execucao por ticket por vez:
// - cada mensagem nova reinicia a espera (o lead escreve em 3 baloes -> 1 resposta);
// - se o agente ja esta respondendo quando chega mensagem nova, roda de novo
//   logo depois (com o historico atualizado) em vez de rodar em paralelo.
// Estado em memoria: reiniciar o servidor descarta o que estava na espera.
export class SdrScheduler {
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  private running = new Set<number>();

  private rerun = new Set<number>();

  constructor(private runner: Runner) {}

  schedule(ticketId: number, delaySeconds: number): void {
    const existing = this.timers.get(ticketId);
    if (existing) clearTimeout(existing);

    this.timers.set(
      ticketId,
      setTimeout(() => {
        this.timers.delete(ticketId);
        this.fire(ticketId);
      }, Math.max(0, delaySeconds) * 1000)
    );
  }

  private async fire(ticketId: number): Promise<void> {
    if (this.running.has(ticketId)) {
      this.rerun.add(ticketId);
      return;
    }

    this.running.add(ticketId);
    try {
      await this.runner(ticketId);
    } catch (err) {
      logger.error({ err, ticketId }, "[sdr] execucao do agente falhou");
    } finally {
      this.running.delete(ticketId);
    }

    if (this.rerun.delete(ticketId)) {
      await this.fire(ticketId);
    }
  }

  pending(): number {
    return this.timers.size + this.running.size;
  }
}

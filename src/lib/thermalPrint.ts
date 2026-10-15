/**
 * Utilitário para Impressão Direta via WebUSB (ESC/POS)
 *
 * O navegador exige que o usuário autorize a impressora uma única vez
 * (requestDevice). Depois disso a permissão fica salva no Chrome/Edge e a
 * reconexão é feita automaticamente via getDevices(), sem abrir o seletor.
 */

const STORAGE_VENDOR = 'thermal_printer_vendor';
const STORAGE_PRODUCT = 'thermal_printer_product';

const usb = () => (navigator as any).usb;

export class ThermalPrinter {
  private device: any | null = null;

  private endpointNumber: number = 1;

  isSupported() {
    return typeof navigator !== 'undefined' && !!usb();
  }

  /** Abre o seletor do navegador. Precisa ser chamado a partir de um clique. */
  async requestDevice() {
    if (!this.isSupported()) {
      throw new Error('Este navegador não suporta impressão USB. Use o Google Chrome ou o Microsoft Edge.');
    }
    const device = await usb().requestDevice({ filters: [] });
    await this.connect(device);
    localStorage.setItem(STORAGE_VENDOR, String(device.vendorId));
    localStorage.setItem(STORAGE_PRODUCT, String(device.productId));
    return device;
  }

  /**
   * Garante uma conexão ativa, reaproveitando a impressora já autorizada.
   * Só abre o seletor quando nenhuma impressora foi autorizada ainda.
   */
  async ensureConnected() {
    if (this.device?.opened) return;
    this.device = null;

    if (!this.isSupported()) {
      throw new Error('Este navegador não suporta impressão USB. Use o Google Chrome ou o Microsoft Edge.');
    }

    const devices: any[] = await usb().getDevices();
    const vendorId = Number(localStorage.getItem(STORAGE_VENDOR));
    const productId = Number(localStorage.getItem(STORAGE_PRODUCT));
    const saved = devices.find((d) => d.vendorId === vendorId && d.productId === productId)
      || (devices.length === 1 ? devices[0] : null);

    if (saved) {
      await this.connect(saved);
      return;
    }

    await this.requestDevice();
  }

  async print(text: string) {
    const encoder = new TextEncoder();
    await this.printBytes(encoder.encode('\x1B\x40' + sanitize(text) + '\n\n\n\n\x1D\x56\x00'));
  }

  async printBytes(data: Uint8Array) {
    await this.ensureConnected();
    try {
      await this.device.transferOut(this.endpointNumber, data);
    } catch (error) {
      // A impressora pode ter sido desligada/reconectada: tenta uma nova conexão uma vez.
      console.error('Falha ao enviar para a impressora, reconectando:', error);
      this.device = null;
      await this.ensureConnected();
      await this.device.transferOut(this.endpointNumber, data);
    }
  }

  private async connect(device: any) {
    if (!device.opened) await device.open();
    if (!device.configuration) await device.selectConfiguration(1);

    for (const iface of device.configuration.interfaces) {
      const alternate = iface.alternate || iface.alternates[0];
      const outEndpoint = alternate.endpoints.find((e: any) => e.direction === 'out');
      if (!outEndpoint) continue;
      try {
        if (!iface.claimed) await device.claimInterface(iface.interfaceNumber);
        this.endpointNumber = outEndpoint.endpointNumber;
        this.device = device;
        return;
      } catch {
        // Tenta a próxima interface USB disponível.
      }
    }

    throw new Error(
      'Não foi possível acessar a impressora USB. Verifique se ela está ligada e se nenhum outro programa está usando.'
    );
  }
}

/** Remove acentos e caracteres que a impressora não imprime. */
export const sanitize = (text: string) => text
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^ -~\n]/g, '');

export const thermalPrinter = new ThermalPrinter();

/**
 * Utilitário para Impressão Direta via WebUSB (ESC/POS)
 */

export class ThermalPrinter {
  private device: any | null = null;

  private endpointNumber: number = 1;

  async requestDevice() {
    try {
      this.device = await (navigator as any).usb.requestDevice({ filters: [] });
      await this.device.open();
      if (!this.device.configuration) {
        await this.device.selectConfiguration(1);
      }

      // Encontrar a interface correta e o endpoint de saída
      let claimed = false;
      for (const iface of this.device.configuration!.interfaces) {
        try {
          await this.device.claimInterface(iface.interfaceNumber);
          claimed = true;
          // Procurar o endpoint OUT
          const alternate = iface.alternate || iface.alternates[0];
          const outEndpoint = alternate.endpoints.find((e: any) => e.direction === 'out');
          if (outEndpoint) {
            this.endpointNumber = outEndpoint.endpointNumber;
            break;
          }
        } catch {
          // Tenta a próxima interface
        }
      }

      if (!claimed) {
        throw new Error('Não foi possível reivindicar nenhuma interface USB.');
      }

      // Salva o ID da impressora para reconexão automática se possível
      localStorage.setItem('thermal_printer_vendor', this.device.vendorId.toString());
      localStorage.setItem('thermal_printer_product', this.device.productId.toString());

      return this.device;
    } catch (error) {
      console.error('Erro ao conectar impressora:', error);
      throw error;
    }
  }

  async print(text: string) {
    if (!this.device) {
      // Tenta reconectar se já houver um ID salvo
      const vendorId = localStorage.getItem('thermal_printer_vendor');
      if (vendorId) {
        try {
          const devices = await (navigator as any).usb.getDevices();
          this.device = devices.find((d: any) => d.vendorId === parseInt(vendorId)) || null;
          if (this.device) {
            await this.device.open();
            if (!this.device.configuration) {
              await this.device.selectConfiguration(1);
            }

            for (const iface of this.device.configuration!.interfaces) {
              try {
                await this.device.claimInterface(iface.interfaceNumber);
                const alternate = iface.alternate || iface.alternates[0];
                const outEndpoint = alternate.endpoints.find((e: any) => e.direction === 'out');
                if (outEndpoint) {
                  this.endpointNumber = outEndpoint.endpointNumber;
                  break;
                }
              } catch {
                // Tenta a próxima interface USB disponível.
              }
            }
          }
        } catch (e) {
          console.error('Falha na reconexão automática:', e);
        }
      }
    }

    if (!this.device) throw new Error('Impressora não conectada');

    const encoder = new TextEncoder();

    // Comandos ESC/POS Básicos
    const INIT = '\x1B\x40';
    const CUT = '\x1D\x56\x00';
    const FEED = '\n\n\n';

    const cleanText = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\u0020-\u007E\n\r\t]/g, '');

    const data = encoder.encode(INIT + cleanText + FEED + CUT);
    await this.sendData(data);
  }

  /**
   * Imprime texto seguido de um QR Code (útil para o comprovante online)
   */
  async printWithQRCode(text: string, qrCodeData: string) {
    if (!this.device) await this.requestDevice();
    if (!this.device) throw new Error('Impressora não conectada');

    const encoder = new TextEncoder();

    // Comandos Iniciais
    const INIT = '\x1B\x40';
    const FEED = '\n\n';
    const CUT = '\x1D\x56\x00';

    const cleanText = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\u0020-\u007E\n\r\t]/g, '');

    // Comandos QR Code (Padrão ESC/POS)
    const storeLen = qrCodeData.length + 3;
    const storeL = storeLen & 0xFF;
    const storeH = (storeLen >> 8) & 0xFF;

    const qrCommands = [
      '\x1B\x61\x01', // Centralizar
      '\x1D\x28\x6B\x04\x00\x31\x41\x32\x00', // Modelo 2
      '\x1D\x28\x6B\x03\x00\x31\x43\x08',     // Tamanho do módulo (8)
      '\x1D\x28\x6B\x03\x00\x31\x45\x30',     // Correção de erro L
      `\x1D\x28\x6B${String.fromCharCode(storeL)}${String.fromCharCode(storeH)}\x31\x50\x30${qrCodeData}`, // Armazenar dados
      '\x1D\x28\x6B\x03\x00\x31\x51\x30',     // Imprimir QR Code
    ].join('');

    const mainData = encoder.encode(INIT + cleanText + FEED);
    const qrData = encoder.encode(qrCommands + '\n\n\n' + CUT);

    const combinedData = new Uint8Array(mainData.length + qrData.length);
    combinedData.set(mainData);
    combinedData.set(qrData, mainData.length);

    await this.sendData(combinedData);
  }

  private async sendData(data: Uint8Array) {
    if (!this.device) return;
    try {
        await this.device.transferOut(this.endpointNumber, data);
    } catch (e) {
        console.error('Erro no transferOut principal:', e);
        // Fallback para tentar outros endpoints caso a detecção dinâmica falhe
        try { await this.device.transferOut(1, data); } catch {
          try { await this.device.transferOut(2, data); } catch {
            try { await this.device.transferOut(3, data); } catch {
              console.error('Falha em todos os endpoints.');
            }
          }
        }
    }
  }
}

export const thermalPrinter = new ThermalPrinter();

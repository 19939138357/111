export interface EmailNotificationOptions {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  paidAt: Date;
}

export interface RFIDScanResult {
  success: boolean;
  rfidTag: string;
  timestamp: Date;
}

export interface CollectionSyncResult {
  success: boolean;
  updated: number;
  added: number;
  timestamp: Date;
}

export class MockEmailProvider {
  static async send(options: EmailNotificationOptions): Promise<boolean> {
    console.log('[MockEmail] 发送邮件:', {
      to: options.to,
      subject: options.subject,
      template: options.template,
    });
    return true;
  }

  static async sendLoanCheckoutNotification(
    readerEmail: string,
    bookTitle: string,
    dueDate: Date
  ): Promise<boolean> {
    return this.send({
      to: readerEmail,
      subject: '借阅成功通知',
      template: 'loan-checkout',
      context: { bookTitle, dueDate },
    });
  }

  static async sendOverdueNotification(
    readerEmail: string,
    bookTitle: string,
    overdueDays: number
  ): Promise<boolean> {
    return this.send({
      to: readerEmail,
      subject: '超期提醒',
      template: 'overdue-notice',
      context: { bookTitle, overdueDays },
    });
  }
}

export class MockPaymentProvider {
  static async processFinePayment(
    fineId: string,
    amount: number,
    paymentMethod: string = 'mock'
  ): Promise<PaymentResult> {
    console.log('[MockPayment] 处理罚金支付:', {
      fineId,
      amount,
      paymentMethod,
    });
    return {
      success: true,
      transactionId: `TXN-MOCK-${Date.now()}`,
      amount,
      paidAt: new Date(),
    };
  }
}

export class MockRFIDProvider {
  static async scanRFID(rfidTag: string): Promise<RFIDScanResult> {
    console.log('[MockRFID] 扫描 RFID:', rfidTag);
    return {
      success: true,
      rfidTag,
      timestamp: new Date(),
    };
  }

  static async batchScan(tags: string[]): Promise<RFIDScanResult[]> {
    console.log('[MockRFID] 批量扫描:', tags.length, '个标签');
    return tags.map((tag) => ({
      success: true,
      rfidTag: tag,
      timestamp: new Date(),
    }));
  }
}

export class MockCollectionSyncProvider {
  static async syncFromExternalSystem(): Promise<CollectionSyncResult> {
    console.log('[MockCollectionSync] 从外部系统同步馆藏...');
    return {
      success: true,
      updated: 0,
      added: 0,
      timestamp: new Date(),
    };
  }
}

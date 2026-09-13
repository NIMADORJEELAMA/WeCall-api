// qz.service.ts
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class QzService {
  private privateKey: string;

  constructor() {
    // Ensure this path is correct relative to where you run 'npm run start'
    const keyPath = path.join(process.cwd(), 'private-key.pem');
    this.privateKey = fs.readFileSync(keyPath, 'utf8');
  }

  sign(data: string): string {
    const signer = crypto.createSign('RSA-SHA256'); // Standard for QZ
    signer.update(data);
    signer.end();
    return signer.sign(this.privateKey, 'base64');
  }
}

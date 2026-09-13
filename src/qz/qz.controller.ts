import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { QzService } from './qz.service';
import type { Response } from 'express'; // Remember the 'type' keyword!

@Controller('qz')
export class QzController {
  constructor(private readonly qzService: QzService) {}

  @Post('sign')
  async sign(@Body() body: any, @Res() res: Response) {
    console.log('BODY RECEIVED:', body);

    if (!body?.data) {
      return res.status(400).send('Missing data property');
    }

    try {
      const signature = this.qzService.sign(body.data);

      return res.status(200).type('text/plain').send(signature);
    } catch (error) {
      return res.status(500).send('Signing failed');
    }
  }
}

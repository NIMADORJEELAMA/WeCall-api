// src/creators/creators.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { CreatorsService } from './creators.service';

@Controller('creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  @Get('explore')
  getExploreCreators() {
    return this.creatorsService.getExploreCreators();
  }

  @Get(':id')
  getCreator(@Param('id') id: string) {
    return this.creatorsService.getCreator(id);
  }
}

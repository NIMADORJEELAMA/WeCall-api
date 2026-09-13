// src/creators/creators.controller.ts

import { Controller, Get, Param } from '@nestjs/common';
import { CreatorsService } from './creators.service';

@Controller('creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  // -------------------------------------------------------------
  // EXPLORE
  // -------------------------------------------------------------

  @Get('explore')
  getExploreCreators() {
    return this.creatorsService.getExploreCreators();
  }

  // -------------------------------------------------------------
  // GET CREATOR BY USERNAME
  // -------------------------------------------------------------

  @Get('username/:username')
  getCreatorByUsername(@Param('username') username: string) {
    return this.creatorsService.getCreatorByUsername(username);
  }

  // -------------------------------------------------------------
  // GET CREATOR BY USER ID
  // -------------------------------------------------------------

  @Get(':id')
  getCreator(@Param('id') id: string) {
    return this.creatorsService.getCreator(id);
  }
}

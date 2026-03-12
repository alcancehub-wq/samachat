import { Module } from '@nestjs/common';
import { DialogsController } from './dialogs.controller';
import { DialogsService } from './dialogs.service';
import { DialogTagsController } from './tags.controller';
import { DialogTagsService } from './tags.service';
import { DialogVariablesController } from './variables.controller';
import { DialogVariablesService } from './variables.service';

@Module({
  controllers: [DialogsController, DialogTagsController, DialogVariablesController],
  providers: [DialogsService, DialogTagsService, DialogVariablesService],
})
export class DialogsModule {}

import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { MergeFormsDto } from './dto/merge-forms.dto';
import { GoogleFormMapping } from './interfaces/form.interface';

@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Get('list')
  async listForms(): Promise<GoogleFormMapping[]> {
    return this.formsService.listForms();
  }

  @Get(':id')
  async getFormDetails(@Param('id') id: string) {
    return this.formsService.getFormDetails(id);
  }

  @Post('create')
  async createForm(@Body() body: CreateFormDto) {
    return this.formsService.createForm(body);
  }

  @Post('merge')
  async mergeForms(@Body() body: MergeFormsDto) {
    return this.formsService.mergeForms(body);
  }
}

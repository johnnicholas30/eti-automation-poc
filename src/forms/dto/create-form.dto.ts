import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateFormDto {
  @IsString()
  @IsNotEmpty()
  documentTitle: string;

  @IsString()
  @IsNotEmpty()
  formTitle: string;

  @IsString()
  @IsOptional()
  description?: string;
}

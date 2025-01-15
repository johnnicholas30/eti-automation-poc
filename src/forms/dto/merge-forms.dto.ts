import {
  IsArray,
  IsString,
  ArrayMinSize,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class MergeFormsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  formIds: string[];

  @IsString()
  @IsNotEmpty()
  newFormTitle: string;

  @IsString()
  @IsOptional()
  newDocumentTitle?: string;
}

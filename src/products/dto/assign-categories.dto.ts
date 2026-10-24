import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsPositive,
} from 'class-validator';

export class AssignCategoriesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  categoryIds: number[];
}



import { ApiProperty } from '@nestjs/swagger';

export class PreservativeAdditiveDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;
}

export class ElementWeightAnalysisDto {
  @ApiProperty()
  element: string;

  @ApiProperty()
  quantity: string;

  @ApiProperty()
  dailyIntake: string;

  @ApiProperty()
  weeklyIntake: string;

  @ApiProperty()
  insight: string;
}

export class DocResultDto {
  [key: string]: any;
}

export class DocDto {
  @ApiProperty()
  additive: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ type: [DocResultDto] })
  results: Record<string, any>[];
}

export class CreateFoodDto {
  @ApiProperty()
  foodType: string;

  @ApiProperty({ type: [PreservativeAdditiveDto] })
  preservativesAdditives: PreservativeAdditiveDto[];

  @ApiProperty({ type: [ElementWeightAnalysisDto] })
  elementWeightAnalysis: ElementWeightAnalysisDto[];

  @ApiProperty()
  safeUserLevel: string;

  @ApiProperty()
  carbohydrates: number;

  @ApiProperty()
  potentialHumanBodyEffects: string;

  @ApiProperty({ type: [DocDto] })
  docs: DocDto[];
}

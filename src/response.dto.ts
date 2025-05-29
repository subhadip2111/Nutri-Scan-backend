import { ApiProperty } from '@nestjs/swagger';

export class PreservativeAdditiveDto {
  @ApiProperty({ example: 'Acidity Regulator (338)' })
  name: string;

  @ApiProperty({ example: 'Likely phosphoric acid, used to provide tartness and as a preservative.' })
  description: string;
}

export class ElementWeightAnalysisDto {
  @ApiProperty({ example: 'Energy' })
  element: string;

  @ApiProperty({ example: '44 kcal per 100ml' })
  quantity: string;

  @ApiProperty({ example: '220 kcal per 500ml' })
  dailyIntake: string;

  @ApiProperty({ example: '1540 kcal per week' })
  weeklyIntake: string;

  @ApiProperty({ example: 'This is a relatively low-calorie beverage per serving.' })
  insight: string;
}

export class DocDto {
  @ApiProperty({ example: 'Acidity Regulator (338)' })
  additive: string;

  @ApiProperty({ example: 'Likely phosphoric acid, used to provide tartness and as a preservative.' })
  description: string;

  @ApiProperty({
    type: [Object],
    example: [
      {
        url: 'https://www.specialtyfoodingredients.eu/ingredients_cat/acidity-regulators/',
        title: 'Acidity regulators – EU Specialty Food Ingredients',
        snippet: 'Acidity regulators increase the acidity of a foodstuff or are used to...',
      },
    ],
  })
  results: Record<string, any>[];
}

export class BeverageDto {
  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Text extracted and processed successfully' })
  message: string;

  @ApiProperty({ example: 'NUTRITIONFACTS IT RIGINALTTASTE ...' })
  extractedText: string;

  @ApiProperty({ example: 'Beverage (Carbonated Drink)' })
  foodType: string;

  @ApiProperty({
    type: [PreservativeAdditiveDto],
    example: [
      {
        name: 'Acidity Regulator (338)',
        description: 'Likely phosphoric acid, used to provide tartness and as a preservative.',
      },
      {
        name: 'Natural Flavors',
        description: 'Adds flavor to the drink.',
      },
    ],
  })
  preservativesAdditives: PreservativeAdditiveDto[];

  @ApiProperty({
    type: [ElementWeightAnalysisDto],
    example: [
      {
        element: 'Energy',
        quantity: '44 kcal per 100ml',
        dailyIntake: '220 kcal per 500ml',
        weeklyIntake: '1540 kcal per week',
        insight: 'This is a relatively low-calorie beverage per serving.',
      },
      {
        element: 'Carbohydrates',
        quantity: '11.0g per 100ml',
        dailyIntake: '55.0g',
        weeklyIntake: '385.0g',
        insight: 'Moderate carbohydrate content, mostly from sugars.',
      },
    ],
  })
  elementWeightAnalysis: ElementWeightAnalysisDto[];

  @ApiProperty({
    example: 'Healthy adults can likely consume this product in moderate amounts. Due to the caffeine content (although unspecified, it is present), it is probably not suitable for children. Pregnant or breastfeeding women should exercise caution due to the caffeine and other additives. Individuals sensitive to caffeine or acidity regulators should also be cautious.',
  })
  safeUserLevel: string;

  @ApiProperty({ example: 'N/A' })
  potentialHumanBodyEffects: string;

  @ApiProperty({
    type: [DocDto],
    example: [
      {
        additive: 'Acidity Regulator (338)',
        description: 'Likely phosphoric acid, used to provide tartness and as a preservative.',
        results: [
          {
            url: 'https://www.specialtyfoodingredients.eu/ingredients_cat/acidity-regulators/',
            title: 'Acidity regulators – EU Specialty Food Ingredients',
            snippet: 'Acidity regulators increase the acidity of a foodstuff or are used to...',
          },
        ],
      },
    ],
  })
  docs: DocDto[];
}

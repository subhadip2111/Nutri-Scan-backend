import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FoodDocument = Food & Document;

@Schema({ timestamps: true })
export class Food {
  @Prop()
  foodType: string;

  @Prop({
    type: [
      {
        name: { type: String },
        description: { type: String },
      },
    ],
  })
  preservativesAdditives: {
    name: string;
    description: string;
  }[];

  @Prop({
    type: [
      {
        element: { type: String },
        quantity: { type: String },
        dailyIntake: { type: String },
        weeklyIntake: { type: String },
        insight: { type: String },
      },
    ],
  })
  elementWeightAnalysis: {
    element: string;
    quantity: string;
    dailyIntake: string;
    weeklyIntake: string;
    insight: string;
  }[];

  @Prop()
  safeUserLevel: string;

  @Prop({ type: Number })
  carbohydrates: number;

  @Prop()
  potentialHumanBodyEffects: string;

  @Prop({
    type: [
      {
        additive: { type: String },
        description: { type: String },
        results: { type: [Object] }, 
      },
    ],
  })
  docs: {
    additive: string;
    description: string;
    results: Record<string, any>[];
  }[];
}

export const FoodSchema = SchemaFactory.createForClass(Food);

import { Injectable } from '@nestjs/common';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Food, FoodDocument } from './schema/food.schema';
import { Model } from 'mongoose';

@Injectable()
export class FoodService {
  constructor(@InjectModel(Food.name) private readonly foodModel: Model<FoodDocument>,
  ) { }

  async create(extractedText: any, geminiResponse: any, docs: any) {

    const createFoodDto: CreateFoodDto = {
      foodType: extractedText.foodType,
      preservativesAdditives: geminiResponse.preservativesAdditives,
      elementWeightAnalysis: geminiResponse.elementWeightAnalysis,
      safeUserLevel: extractedText.safeUserLevel,
      carbohydrates: extractedText.carbohydrates,
      potentialHumanBodyEffects: extractedText.potentialHumanBodyEffects,
      docs: docs.map((doc: any) => ({
        additive: doc.additive,
        description: doc.description,
        results: doc.results.map((result: any) => ({
          name: result.name,
          description: result.description,
        })),
      })),
    };


    const food = await this.foodModel.create(createFoodDto);
    console.log('Food created:', food);
    return food;
  }

  findAll() {
    return `This action returns all food`;
  }

  findOne(id: number) {
    return `This action returns a #${id} food`;
  }

  update(id: number, updateFoodDto: UpdateFoodDto) {
    return `This action updates a #${id} food`;
  }

  remove(id: number) {
    return `This action removes a #${id} food`;
  }
}

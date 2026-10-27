export class CategoryResponseDto {
  id: number;
  name: string;
  description: string | null;
}

export class ProductResponseDto {
  id: number;
  name: string;
  description: string | null;
  price: string;
  image: string | null;
  restaurantId: number;
  createdAt: Date;
  categories: CategoryResponseDto[];
}
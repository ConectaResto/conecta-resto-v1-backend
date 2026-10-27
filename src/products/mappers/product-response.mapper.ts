import { Prisma } from "../../../generated/prisma/client.js";
import { ProductResponseDto } from "../dto/responses/product-response.dto.js";

type ProductWithCategories = Prisma.ProductGetPayload<{
    include: {
        productCategories: {
            include: {
                category: true;
            };
        };
    };
}>;

export function mapProductResponse(
    product: ProductWithCategories,
): ProductResponseDto {
    return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        image: product.image,
        restaurantId: product.restaurantId,
        createdAt: product.createdAt,

        categories: product.productCategories.map((relation) => ({
            id: relation.category.id,
            name: relation.category.name,
            description: relation.category.description
        })),
    };
}
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type SeedRecipe = {
  name: string
  inputItem: string
  outputItem: string
  inputPerCraft: number
  outputPerCraft: number
  inputStackSize?: number
  outputStackSize?: number
  isCompress919?: boolean
  aliases?: string[]
}

const seedRecipes: SeedRecipe[] = [
  { name: 'Bones → Bonemeal', inputItem: 'Bone', outputItem: 'Bone Meal', inputPerCraft: 1, outputPerCraft: 3, aliases: ['Bonemeal', 'BoneMeal', 'Bone_Meal'] },
  { name: 'Blaze Rod → Blaze Powder', inputItem: 'Blaze Rod', outputItem: 'Blaze Powder', inputPerCraft: 1, outputPerCraft: 2 }
]

async function main() {
  for (const r of seedRecipes) {
    const existing = await prisma.flipRecipe.findFirst({ where: { name: r.name } })
    const created = existing
      ? await prisma.flipRecipe.update({ where: { id: existing.id }, data: {
          inputItem: r.inputItem,
          outputItem: r.outputItem,
          inputPerCraft: r.inputPerCraft,
          outputPerCraft: r.outputPerCraft,
          inputStackSize: r.inputStackSize ?? 64,
          outputStackSize: r.outputStackSize ?? 64,
          isCompress919: r.isCompress919 ?? false,
        } })
      : await prisma.flipRecipe.create({ data: {
          name: r.name,
          inputItem: r.inputItem,
          outputItem: r.outputItem,
          inputPerCraft: r.inputPerCraft,
          outputPerCraft: r.outputPerCraft,
          inputStackSize: r.inputStackSize ?? 64,
          outputStackSize: r.outputStackSize ?? 64,
          isCompress919: r.isCompress919 ?? false,
        } })

    if (r.aliases?.length) {
      for (const alias of r.aliases) {
        await prisma.recipeAlias.upsert({
          where: { alias: alias.toLowerCase() },
          create: { alias: alias.toLowerCase(), canonical: r.outputItem, recipeId: created.id },
          update: { canonical: r.outputItem, recipeId: created.id }
        })
      }
    }
  }
}

main().finally(async () => {
  await prisma.$disconnect()
})


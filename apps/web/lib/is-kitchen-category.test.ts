import { describe, expect, it } from 'vitest'
import { isKitchenCategory } from './is-kitchen-category'

describe('isKitchenCategory', () => {
  // Food categories that should go to kitchen
  describe('food categories (should return true)', () => {
    const foodCategories = [
      'Comida',
      'Cozinha',
      'Prato principal',
      'Refeição',
      'Almoço executivo',
      'Jantar',
      'Petisco',
      'Tira-gosto',
      'Tiragosto',
      'Aperitivo',
      'Entrada',
      'Lanche',
      'Sanduíche',
      'Burger',
      'Hambúrguer',
      'Pizza',
      'Massa',
      'Macarrão',
      'Frango',
      'Carne',
      'Peixe',
      'Frutos do mar',
      'Salada',
      'Sopa',
      'Caldo',
      'Porção',
      'Porções',
      'Combo refeição',
      'Kit lanche',
      'Tapioca',
      'Crepe',
      'Espetinho',
      'Churrasco',
      'Grill',
      'Grelhado',
      'Frito',
      'Assado',
      'Cozido',
      'Sobremesa',
      'Doce',
      'Torta',
      'Pão de alho',
      'Bruscheta',
      'Carpaccio',
      'Nachos',
      'Asa de frango',
      'Bolinho de bacalhau',
    ]

    for (const category of foodCategories) {
      it(`returns true for "${category}"`, () => {
        expect(isKitchenCategory(category)).toBe(true)
      })
    }
  })

  // Drink categories that should NOT go to kitchen
  describe('drink categories (should return false)', () => {
    const drinkCategories = [
      'Cerveja',
      'Chopp',
      'Chope',
      'Vinho',
      'Drinque',
      'Drink',
      'Refrigerante',
      'Refri',
      'Suco',
      'Água',
      'Bebida',
      'Energético',
      'Destilado',
      'Whisky',
      'Vodka',
      'Rum',
      'Gin',
      'Cachaça',
      'Sake',
      'Espumante',
      'Prosecco',
      'Champagne',
      'Kombucha',
      'Smoothie',
    ]

    for (const category of drinkCategories) {
      it(`returns false for "${category}"`, () => {
        expect(isKitchenCategory(category)).toBe(false)
      })
    }
  })

  // Edge cases
  describe('edge cases', () => {
    it('returns false for unknown category', () => {
      expect(isKitchenCategory('Acessórios')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isKitchenCategory('')).toBe(false)
    })

    it('is case insensitive', () => {
      expect(isKitchenCategory('PIZZA')).toBe(true)
      expect(isKitchenCategory('CERVEJA')).toBe(false)
    })

    it('handles accented characters via normalization', () => {
      expect(isKitchenCategory('Refeição')).toBe(true)
      expect(isKitchenCategory('Porção')).toBe(true)
    })

    it('returns false for category with both drink and food terms (drink takes precedence)', () => {
      // "Bebida" matches drinks first
      expect(isKitchenCategory('Bebida com comida')).toBe(false)
    })
  })
})

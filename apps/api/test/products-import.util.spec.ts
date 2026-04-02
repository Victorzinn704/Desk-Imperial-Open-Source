import { parseProductImportCsv } from '../src/modules/products/products-import.util'

describe('parseProductImportCsv', () => {
  const makeCsv = (header: string, rows: string[]) => [header, ...rows].join('\n')

  it('deve retornar array vazio para conteudo em branco', () => {
    expect(parseProductImportCsv('   ')).toEqual([])
  })

  it('deve retornar array vazio quando so existe cabecalho', () => {
    const csv = 'name,category,description,unitCost,unitPrice,stock\n'
    expect(parseProductImportCsv(csv)).toEqual([])
  })

  it('deve rejeitar CSV com byte nulo', () => {
    const csv = '\0name,category,description,unitCost,unitPrice,stock\nProduto,Categoria,Desc,1,2,3'

    expect(() => parseProductImportCsv(csv)).toThrow('bytes invalidos')
  })

  it('deve rejeitar CSV acima do limite de linhas', () => {
    const header = 'name,category,description,unitCost,unitPrice,stock'
    const rows = Array.from({ length: 501 }, (_, index) => `Produto ${index},Categoria,Desc,1,2,3`)

    expect(() => parseProductImportCsv(makeCsv(header, rows))).toThrow('limite de 500 linhas')
  })

  it('deve rejeitar CSV com mais de 14 colunas', () => {
    const header =
      'name,category,description,unitCost,unitPrice,stock,c1,c2,c3,c4,c5,c6,c7,c8,c9'
    const row = 'Produto,Categoria,Desc,1,2,3,1,2,3,4,5,6,7,8,9'

    expect(() => parseProductImportCsv(makeCsv(header, [row]))).toThrow('maximo 14 colunas')
  })

  it('deve exigir cabecalhos obrigatorios', () => {
    const csv = makeCsv('name,category,description,unitCost,stock', ['Produto,Categoria,Desc,1,3'])

    expect(() => parseProductImportCsv(csv)).toThrow('coluna "unitprice"')
  })

  it('deve exigir stock ou par stockPackages/stockLooseUnits', () => {
    const csv = makeCsv('name,category,description,unitCost,unitPrice', ['Produto,Categoria,Desc,1,2'])

    expect(() => parseProductImportCsv(csv)).toThrow('precisa conter "stock"')
  })

  it('deve parsear delimitador ;, aspas e aspas escapadas, aplicando defaults', () => {
    const csv = makeCsv(
      'name;category;description;unitCost;unitPrice;stockPackages;stockLooseUnits;unitsPerPackage;measurementUnit;measurementValue;brand',
      ['"Combo ""Especial""";Petisco;;10.5;19.9;2;3;6;ml;0.5;Marca X'],
    )

    const [row] = parseProductImportCsv(csv)

    expect(row).toEqual(
      expect.objectContaining({
        line: 2,
        name: 'Combo "Especial"',
        brand: 'Marca X',
        category: 'Petisco',
        packagingClass: 'UN',
        measurementUnit: 'ML',
        measurementValue: 0.5,
        unitsPerPackage: 6,
        description: null,
        unitCost: 10.5,
        unitPrice: 19.9,
        currency: 'BRL',
        stockPackages: 2,
        stockLooseUnits: 3,
        stock: 15,
      }),
    )
  })

  it('deve priorizar stock explicito em vez do calculo derivado', () => {
    const csv = makeCsv(
      'name,category,description,unitCost,unitPrice,unitsPerPackage,stockPackages,stockLooseUnits,stock',
      ['Produto,Categoria,Desc,1,2,10,2,8,7'],
    )

    const [row] = parseProductImportCsv(csv)

    expect(row.stock).toBe(7)
  })

  it('deve tratar stockPackages/stockLooseUnits invalidos como zero', () => {
    const csv = makeCsv(
      'name,category,description,unitCost,unitPrice,unitsPerPackage,stockPackages,stockLooseUnits',
      ['Produto,Categoria,Desc,1,2,0,abc,xyz'],
    )

    const [row] = parseProductImportCsv(csv)

    expect(row.stockPackages).toBe(0)
    expect(row.stockLooseUnits).toBe(0)
    expect(row.stock).toBe(0)
  })

  it('deve rejeitar linha acima do limite maximo de tamanho', () => {
    const longName = 'A'.repeat(4001)
    const csv = makeCsv('name,category,description,unitCost,unitPrice,stock', [`${longName},Categoria,Desc,1,2,3`])

    expect(() => parseProductImportCsv(csv)).toThrow('excede o limite maximo permitido')
  })

  it('deve rejeitar quantidade de colunas diferente do cabecalho', () => {
    const csv = makeCsv('name,category,description,unitCost,unitPrice,stock', ['Produto,Categoria,Desc,1,2'])

    expect(() => parseProductImportCsv(csv)).toThrow('quantidade de colunas invalida')
  })

  it('deve rejeitar celula acima do limite maximo de tamanho', () => {
    const giantDescription = 'B'.repeat(281)
    const csv = makeCsv(
      'name,category,description,unitCost,unitPrice,stock',
      [`Produto,Categoria,${giantDescription},1,2,3`],
    )

    expect(() => parseProductImportCsv(csv)).toThrow('colunas excede o tamanho maximo permitido')
  })

  it('deve rejeitar unitCost invalido', () => {
    const csv = makeCsv('name,category,description,unitCost,unitPrice,stock', ['Produto,Categoria,Desc,abc,2,3'])

    expect(() => parseProductImportCsv(csv)).toThrow('"unitcost" deve ser um numero valido')
  })

  it('deve rejeitar unitPrice negativo', () => {
    const csv = makeCsv('name,category,description,unitCost,unitPrice,stock', ['Produto,Categoria,Desc,1,-2,3'])

    expect(() => parseProductImportCsv(csv)).toThrow('"unitprice" deve ser um numero valido')
  })
})

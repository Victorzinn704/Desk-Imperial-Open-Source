'use client'

import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { type ProductFormInputValues, type ProductFormValues, productSchema } from '@/lib/validation'
import { emptyValues } from './product-form.model'

export function useProductFormBase() {
  const [selectedPreset, setSelectedPreset] = useState('')
  const [measurementMode, setMeasurementMode] = useState('UN')
  const form = useForm<ProductFormInputValues, undefined, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyValues,
  })
  const {
    fields: comboFields,
    append: appendComboItem,
    remove: removeComboItem,
  } = useFieldArray({
    control: form.control,
    name: 'comboItems',
  })

  return {
    appendComboItem,
    comboFields,
    control: form.control,
    errors: form.formState.errors,
    handleSubmit: form.handleSubmit,
    measurementMode,
    register: form.register,
    removeComboItem,
    reset: form.reset,
    selectedPreset,
    setMeasurementMode,
    setSelectedPreset,
    setValue: form.setValue,
  }
}

export type ProductFormBase = ReturnType<typeof useProductFormBase>

import { useState } from 'react'
import { router, useLocalSearchParams } from 'expo-router'
import { defaultAppearanceColor } from '@/utils/institutions/appearance'
import { institutionQueries } from '@/services/database/repository/institution'
import { useInstitutionForm } from '@/hooks/institutions/useInstitutionForm'
import { useInstitutionsStore } from '@/stores/institutions'
import type { IconKey } from '@/utils/icons'

const DEFAULT_ICON: IconKey = 'landmark'

export function useEditInstitution() {
  const params = useLocalSearchParams<{
    id: string
    name?: string
    color?: string
    icon?: string
  }>()

  const id = params.id ?? ''

  const form = useInstitutionForm({
    initialName: params.name ?? '',
    initialColor: params.color ?? defaultAppearanceColor,
    initialIcon: (params.icon as IconKey) ?? DEFAULT_ICON,
    returnTo: `/institution/${id}`,
  })

  const updateInstitutionInStore = useInstitutionsStore((state) => state.updateInstitution)

  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSave = async () => {
    if (!form.validateName(form.name) || isSaving) return

    const payload = form.buildPayload()

    try {
      setIsSaving(true)
      await institutionQueries.update(id, payload)
      updateInstitutionInStore(id, payload)
    } catch (saveError) {
      console.error('Erro ao atualizar instituicao:', saveError)
      form.setNameError('Não foi possível salvar. Tente novamente.')
      setIsSaving(false)
      return
    }

    setIsSaving(false)
    setShowSuccess(true)
    setTimeout(() => router.replace('/(tabs)/institutions'), 900)
  }

  const handleClose = () => router.replace('/(tabs)/institutions')

  return {
    ...form,
    isSaving,
    showSuccess,
    handleSave,
    handleClose,
  }
}

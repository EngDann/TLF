import { useState } from 'react'
import { router } from 'expo-router'
import { defaultAppearanceColor } from '@/utils/institutions/appearance'
import { institutionQueries } from '@/services/database/queries/institution'
import { useInstitutionForm } from '@/hooks/institutions/useInstitutionForm'
import { useInstitutionsStore } from '@/stores/institutions'
import type { IconKey } from '@/utils/icons'

const DEFAULT_ICON: IconKey = 'landmark'

export function useNewInstitution() {
  const form = useInstitutionForm({
    initialName: '',
    initialColor: defaultAppearanceColor,
    initialIcon: DEFAULT_ICON,
    returnTo: '/institution/new',
  })

  const addInstitution = useInstitutionsStore((state) => state.addInstitution)

  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSave = async () => {
    if (!form.validateName(form.name) || isSaving) return

    const payload = form.buildPayload()

    try {
      setIsSaving(true)
      const created = await institutionQueries.create(payload)
      addInstitution({
        id: created.id,
        name: created.name,
        color: created.color,
        icon: created.icon ?? DEFAULT_ICON,
        logoUrl: created.logoUrl,
      })
    } catch (saveError) {
      console.error('Erro ao criar instituicao:', saveError)
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

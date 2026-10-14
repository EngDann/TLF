import { InstitutionForm } from '@/components/finance/institutions/InstitutionForm'
import { useEditInstitution } from '@/hooks/institutions/useEditInstitution'

export default function EditInstitutionScreen() {
  const {
    name,
    setName,
    color,
    icon,
    nameError,
    isFormValid,
    isSaving,
    showSuccess,
    previewName,
    validateName,
    openAppearance,
    handleSave,
    handleClose,
  } = useEditInstitution()

  return (
    <InstitutionForm
      title="Editar Instituição"
      submitLabel="Salvar Alterações"
      name={name}
      onNameChange={setName}
      onNameBlur={() => validateName(name)}
      color={color}
      icon={icon}
      previewName={previewName}
      nameError={nameError}
      submitDisabled={!isFormValid || isSaving}
      successVisible={showSuccess}
      successMessage="Instituição atualizada com sucesso."
      onOpenAppearance={openAppearance}
      onSubmit={handleSave}
      onClose={handleClose}
    />
  )
}

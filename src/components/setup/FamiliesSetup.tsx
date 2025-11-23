import { useState, FormEvent } from 'react'
import { useTripContext } from '@/contexts/TripContext'
import { useParticipantContext } from '@/contexts/ParticipantContext'

interface FamiliesSetupProps {
  onComplete: () => void
  hasSetup: boolean
}

export function FamiliesSetup({ onComplete, hasSetup }: FamiliesSetupProps) {
  const { currentTrip } = useTripContext()
  const {
    families,
    createFamily,
    createParticipant,
    deleteFamily,
    deleteParticipant,
    getParticipantsByFamily,
  } = useParticipantContext()

  const [familyName, setFamilyName] = useState('')
  const [adultNames, setAdultNames] = useState(['', ''])
  const [childrenNames, setChildrenNames] = useState<string[]>([])
  const [adding, setAdding] = useState(false)

  const handleAddFamily = async (e: FormEvent) => {
    e.preventDefault()

    if (!currentTrip || !familyName.trim()) return

    const validAdults = adultNames.filter(n => n.trim())
    if (validAdults.length === 0) {
      alert('Please add at least one adult')
      return
    }

    setAdding(true)
    try {
      // Create family
      const family = await createFamily({
        trip_id: currentTrip.id,
        family_name: familyName.trim(),
        adults: validAdults.length,
        children: childrenNames.filter(n => n.trim()).length,
      })

      if (family) {
        // Create adult participants
        for (const name of validAdults) {
          await createParticipant({
            trip_id: currentTrip.id,
            family_id: family.id,
            name: name.trim(),
            is_adult: true,
          })
        }

        // Create child participants
        for (const name of childrenNames.filter(n => n.trim())) {
          await createParticipant({
            trip_id: currentTrip.id,
            family_id: family.id,
            name: name.trim(),
            is_adult: false,
          })
        }

        // Reset form
        setFamilyName('')
        setAdultNames(['', ''])
        setChildrenNames([])
      }
    } finally {
      setAdding(false)
    }
  }

  const handleDeleteFamily = async (familyId: string) => {
    if (window.confirm('Remove this family and all its members?')) {
      // Get all participants in this family
      const familyParticipants = getParticipantsByFamily(familyId)

      // Delete all participants first
      for (const participant of familyParticipants) {
        await deleteParticipant(participant.id)
      }

      // Then delete the family
      await deleteFamily(familyId)
    }
  }

  const canComplete = families.length > 0

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Add Family
        </h3>

        <form onSubmit={handleAddFamily} className="space-y-4">
          <div>
            <label htmlFor="familyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Family Name
            </label>
            <input
              type="text"
              id="familyName"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="e.g., The Smiths"
              required
              disabled={adding}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Adults (at least 1 required)
            </label>
            {adultNames.map((name, index) => (
              <input
                key={index}
                type="text"
                value={name}
                onChange={(e) => {
                  const newAdults = [...adultNames]
                  newAdults[index] = e.target.value
                  setAdultNames(newAdults)
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white mb-2"
                placeholder={`Adult ${index + 1} name`}
                disabled={adding}
              />
            ))}
            <button
              type="button"
              onClick={() => setAdultNames([...adultNames, ''])}
              className="text-sm text-neutral hover:text-neutral-dark"
              disabled={adding}
            >
              + Add another adult
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Children (optional)
            </label>
            {childrenNames.map((name, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    const newChildren = [...childrenNames]
                    newChildren[index] = e.target.value
                    setChildrenNames(newChildren)
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-neutral focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder={`Child ${index + 1} name`}
                  disabled={adding}
                />
                <button
                  type="button"
                  onClick={() => setChildrenNames(childrenNames.filter((_, i) => i !== index))}
                  className="px-3 text-negative hover:text-negative-dark"
                  disabled={adding}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setChildrenNames([...childrenNames, ''])}
              className="text-sm text-neutral hover:text-neutral-dark"
              disabled={adding}
            >
              + Add child
            </button>
          </div>

          <button
            type="submit"
            disabled={adding || !familyName.trim() || adultNames.every(n => !n.trim())}
            className="w-full bg-neutral text-white px-4 py-2 rounded-lg hover:bg-neutral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? 'Adding...' : '+ Add Family'}
          </button>
        </form>
      </div>

      {families.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Families ({families.length})
          </h3>

          <div className="space-y-4">
            {families.map((family) => {
              const familyParticipants = getParticipantsByFamily(family.id)
              const adults = familyParticipants.filter(p => p.is_adult)
              const children = familyParticipants.filter(p => !p.is_adult)

              return (
                <div
                  key={family.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {family.family_name}
                    </h4>
                    <button
                      onClick={() => handleDeleteFamily(family.id)}
                      className="text-negative hover:text-negative-dark p-1 rounded transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="text-gray-700 dark:text-gray-300">
                      <strong>Adults:</strong> {adults.map(a => a.name).join(', ')}
                    </div>
                    {children.length > 0 && (
                      <div className="text-gray-700 dark:text-gray-300">
                        <strong>Children:</strong> {children.map(c => c.name).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {canComplete && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <button
            onClick={onComplete}
            className="w-full bg-positive text-white px-6 py-3 rounded-lg hover:bg-positive-dark transition-colors font-semibold"
          >
            {hasSetup ? 'Update & Continue' : 'Complete Setup'}
          </button>
        </div>
      )}

      {!canComplete && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Add at least one family to continue
          </p>
        </div>
      )}
    </div>
  )
}

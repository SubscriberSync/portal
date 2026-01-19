'use client'

import { useState, useEffect } from 'react'
import { Loader2, Save, MapPin, Truck, Check, RefreshCw } from 'lucide-react'

interface Carrier {
  carrier_id: string
  carrier_code: string
  name: string
  nickname: string
  services: { service_code: string; name: string }[]
}

interface Warehouse {
  warehouse_id: string
  name: string
  is_default: boolean
  address: {
    name: string
    company?: string
    address1: string
    address2?: string
    city: string
    state: string
    zip: string
    country: string
    phone?: string
  } | null
}

interface ShippingPreferences {
  default_carrier_id: string | null
  default_service_code: string | null
  default_package_code: string | null
  ship_from_warehouse_id: string | null
  ship_from_name: string | null
  ship_from_company: string | null
  ship_from_address1: string | null
  ship_from_address2: string | null
  ship_from_city: string | null
  ship_from_state: string | null
  ship_from_zip: string | null
  ship_from_country: string | null
  ship_from_phone: string | null
  label_format: 'pdf' | 'png' | 'zpl' | null
  label_size: '4x6' | 'letter' | null
}

interface ShippingPreferencesFormProps {
  shipstationConnected: boolean
}

export default function ShippingPreferencesForm({ shipstationConnected }: ShippingPreferencesFormProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingCarriers, setIsLoadingCarriers] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [preferences, setPreferences] = useState<ShippingPreferences>({
    default_carrier_id: null,
    default_service_code: null,
    default_package_code: 'package',
    ship_from_warehouse_id: null,
    ship_from_name: null,
    ship_from_company: null,
    ship_from_address1: null,
    ship_from_address2: null,
    ship_from_city: null,
    ship_from_state: null,
    ship_from_zip: null,
    ship_from_country: 'US',
    ship_from_phone: null,
    label_format: 'pdf',
    label_size: '4x6',
  })

  const [carriers, setCarriers] = useState<Carrier[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])

  // Fetch current preferences
  useEffect(() => {
    async function fetchPreferences() {
      try {
        const response = await fetch('/api/shipping/preferences')
        if (response.ok) {
          const data = await response.json()
          setPreferences(prev => ({ ...prev, ...data }))
        }
      } catch (err) {
        console.error('Failed to fetch preferences:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchPreferences()
  }, [])

  // Fetch carriers from ShipStation
  const fetchCarriers = async () => {
    if (!shipstationConnected) return

    setIsLoadingCarriers(true)
    try {
      const response = await fetch('/api/shipping/carriers')
      if (response.ok) {
        const data = await response.json()
        setCarriers(data.carriers || [])
        setWarehouses(data.warehouses || [])
      }
    } catch (err) {
      console.error('Failed to fetch carriers:', err)
    } finally {
      setIsLoadingCarriers(false)
    }
  }

  // Fetch carriers on mount if connected
  useEffect(() => {
    if (shipstationConnected) {
      fetchCarriers()
    }
  }, [shipstationConnected])

  // Copy warehouse address to ship-from
  const handleCopyWarehouseAddress = (warehouseId: string) => {
    const warehouse = warehouses.find(w => w.warehouse_id === warehouseId)
    if (warehouse?.address) {
      setPreferences(prev => ({
        ...prev,
        ship_from_warehouse_id: warehouseId,
        ship_from_name: warehouse.address?.name || prev.ship_from_name,
        ship_from_company: warehouse.address?.company || null,
        ship_from_address1: warehouse.address?.address1 || null,
        ship_from_address2: warehouse.address?.address2 || null,
        ship_from_city: warehouse.address?.city || null,
        ship_from_state: warehouse.address?.state || null,
        ship_from_zip: warehouse.address?.zip || null,
        ship_from_country: warehouse.address?.country || 'US',
        ship_from_phone: warehouse.address?.phone || null,
      }))
    }
  }

  // Get services for selected carrier
  const selectedCarrier = carriers.find(c => c.carrier_id === preferences.default_carrier_id)

  // Save preferences
  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      const response = await fetch('/api/shipping/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save preferences')
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-[#e07a42] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Ship-From Address */}
      <div>
        <h3 className="text-md font-medium text-white mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#e07a42]" />
          Ship-From Address
        </h3>

        {/* Warehouse Quick Fill */}
        {warehouses.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
            <p className="text-sm text-[#71717a] mb-2">
              Copy from ShipStation warehouse:
            </p>
            <div className="flex flex-wrap gap-2">
              {warehouses.map(warehouse => (
                <button
                  key={warehouse.warehouse_id}
                  onClick={() => handleCopyWarehouseAddress(warehouse.warehouse_id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    preferences.ship_from_warehouse_id === warehouse.warehouse_id
                      ? 'bg-[#e07a42]/20 text-[#e07a42] border border-[#e07a42]/30'
                      : 'bg-[rgba(255,255,255,0.05)] text-[#a1a1aa] hover:bg-[rgba(255,255,255,0.1)]'
                  }`}
                >
                  {warehouse.name}
                  {warehouse.is_default && ' (Default)'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#71717a] mb-1">Name</label>
            <input
              type="text"
              value={preferences.ship_from_name || ''}
              onChange={(e) => setPreferences(prev => ({ ...prev, ship_from_name: e.target.value || null }))}
              className="w-full px-3 py-2 rounded-lg bg-[#0c0c0c] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#e07a42]"
              placeholder="Sender name"
            />
          </div>
          <div>
            <label className="block text-sm text-[#71717a] mb-1">Company</label>
            <input
              type="text"
              value={preferences.ship_from_company || ''}
              onChange={(e) => setPreferences(prev => ({ ...prev, ship_from_company: e.target.value || null }))}
              className="w-full px-3 py-2 rounded-lg bg-[#0c0c0c] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#e07a42]"
              placeholder="Company name (optional)"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-[#71717a] mb-1">Address Line 1</label>
            <input
              type="text"
              value={preferences.ship_from_address1 || ''}
              onChange={(e) => setPreferences(prev => ({ ...prev, ship_from_address1: e.target.value || null }))}
              className="w-full px-3 py-2 rounded-lg bg-[#0c0c0c] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#e07a42]"
              placeholder="Street address"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-[#71717a] mb-1">Address Line 2</label>
            <input
              type="text"
              value={preferences.ship_from_address2 || ''}
              onChange={(e) => setPreferences(prev => ({ ...prev, ship_from_address2: e.target.value || null }))}
              className="w-full px-3 py-2 rounded-lg bg-[#0c0c0c] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#e07a42]"
              placeholder="Suite, unit, etc. (optional)"
            />
          </div>
          <div>
            <label className="block text-sm text-[#71717a] mb-1">City</label>
            <input
              type="text"
              value={preferences.ship_from_city || ''}
              onChange={(e) => setPreferences(prev => ({ ...prev, ship_from_city: e.target.value || null }))}
              className="w-full px-3 py-2 rounded-lg bg-[#0c0c0c] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#e07a42]"
              placeholder="City"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#71717a] mb-1">State</label>
              <input
                type="text"
                value={preferences.ship_from_state || ''}
                onChange={(e) => setPreferences(prev => ({ ...prev, ship_from_state: e.target.value || null }))}
                className="w-full px-3 py-2 rounded-lg bg-[#0c0c0c] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#e07a42]"
                placeholder="State"
                maxLength={2}
              />
            </div>
            <div>
              <label className="block text-sm text-[#71717a] mb-1">ZIP</label>
              <input
                type="text"
                value={preferences.ship_from_zip || ''}
                onChange={(e) => setPreferences(prev => ({ ...prev, ship_from_zip: e.target.value || null }))}
                className="w-full px-3 py-2 rounded-lg bg-[#0c0c0c] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#e07a42]"
                placeholder="ZIP code"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-[#71717a] mb-1">Phone</label>
            <input
              type="tel"
              value={preferences.ship_from_phone || ''}
              onChange={(e) => setPreferences(prev => ({ ...prev, ship_from_phone: e.target.value || null }))}
              className="w-full px-3 py-2 rounded-lg bg-[#0c0c0c] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#e07a42]"
              placeholder="Phone number"
            />
          </div>
        </div>
      </div>

      {/* Default Carrier/Service */}
      {shipstationConnected && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-medium text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#e07a42]" />
              Default Carrier & Service
            </h3>
            <button
              onClick={fetchCarriers}
              disabled={isLoadingCarriers}
              className="text-sm text-[#71717a] hover:text-white flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingCarriers ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {carriers.length === 0 ? (
            <p className="text-sm text-[#71717a] p-4 bg-[rgba(255,255,255,0.02)] rounded-lg">
              No carriers found. Make sure you have carriers configured in ShipStation.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#71717a] mb-1">Carrier</label>
                <select
                  value={preferences.default_carrier_id || ''}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    default_carrier_id: e.target.value || null,
                    default_service_code: null, // Reset service when carrier changes
                  }))}
                  className="w-full px-3 py-2 rounded-lg bg-[#0c0c0c] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#e07a42]"
                >
                  <option value="">Select carrier...</option>
                  {carriers.map(carrier => (
                    <option key={carrier.carrier_id} value={carrier.carrier_id}>
                      {carrier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[#71717a] mb-1">Service</label>
                <select
                  value={preferences.default_service_code || ''}
                  onChange={(e) => setPreferences(prev => ({ ...prev, default_service_code: e.target.value || null }))}
                  disabled={!selectedCarrier}
                  className="w-full px-3 py-2 rounded-lg bg-[#0c0c0c] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#e07a42] disabled:opacity-50"
                >
                  <option value="">Select service...</option>
                  {selectedCarrier?.services.map(service => (
                    <option key={service.service_code} value={service.service_code}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Label Format */}
      <div>
        <h3 className="text-md font-medium text-white mb-3">Label Format</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#71717a] mb-1">Format</label>
            <select
              value={preferences.label_format || 'pdf'}
              onChange={(e) => setPreferences(prev => ({ ...prev, label_format: e.target.value as 'pdf' | 'png' | 'zpl' }))}
              className="w-full px-3 py-2 rounded-lg bg-[#0c0c0c] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#e07a42]"
            >
              <option value="pdf">PDF</option>
              <option value="png">PNG</option>
              <option value="zpl">ZPL (Thermal)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#71717a] mb-1">Size</label>
            <select
              value={preferences.label_size || '4x6'}
              onChange={(e) => setPreferences(prev => ({ ...prev, label_size: e.target.value as '4x6' | 'letter' }))}
              className="w-full px-3 py-2 rounded-lg bg-[#0c0c0c] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#e07a42]"
            >
              <option value="4x6">4x6 (Thermal)</option>
              <option value="letter">Letter (8.5x11)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 rounded-lg bg-[#e07a42] text-white font-medium hover:bg-[#c86a35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Preferences
            </>
          )}
        </button>
      </div>
    </div>
  )
}

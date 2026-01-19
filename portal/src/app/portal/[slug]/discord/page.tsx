'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { 
  MessageSquare, 
  Users, 
  Link2, 
  Settings, 
  Plus, 
  Trash2, 
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  on_cancel_behavior: 'remove_roles' | 'kick'
}

interface RoleMapping {
  id: string
  subscription_tier: string
  discord_role_id: string
  discord_role_name: string
}

interface DiscordRole {
  id: string
  name: string
  color: number
  position: number
}

interface Stats {
  total_subscribers: number
  connected_subscribers: number
  in_guild_count: number
  connection_rate: number
}

export default function DiscordPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const justConnected = searchParams.get('connected') === 'true'

  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [connected, setConnected] = useState(false)
  const [guild, setGuild] = useState<DiscordGuild | null>(null)
  const [mappings, setMappings] = useState<RoleMapping[]>([])
  const [discordRoles, setDiscordRoles] = useState<DiscordRole[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // New mapping form state
  const [showAddMapping, setShowAddMapping] = useState(false)
  const [newTier, setNewTier] = useState('')
  const [newRoleId, setNewRoleId] = useState('')
  const [newRoleName, setNewRoleName] = useState('')
  const [createNewRole, setCreateNewRole] = useState(false)

  const connectUrl = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/connect/${slug}/discord`

  useEffect(() => {
    fetchDiscordData()
    fetchStats()
  }, [])

  const fetchDiscordData = async () => {
    try {
      const response = await fetch('/api/discord/roles')
      const data = await response.json()

      if (data.connected) {
        setConnected(true)
        setGuild(data.guild)
        setMappings(data.mappings || [])
        setDiscordRoles(data.discordRoles || [])
      } else {
        setConnected(false)
      }
    } catch (err) {
      console.error('Failed to fetch Discord data:', err)
      setError('Failed to load Discord settings')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/discord/stats')
      const data = await response.json()
      if (data.stats) {
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/discord', {
        method: 'POST',
      })
      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Failed to start Discord connection')
      }
    } catch (err) {
      setError('Failed to connect to Discord')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Discord? This will remove all role mappings.')) {
      return
    }

    try {
      const response = await fetch('/api/discord/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove_customer_connections: false }),
      })

      if (response.ok) {
        setConnected(false)
        setGuild(null)
        setMappings([])
        setStats(null)
      } else {
        setError('Failed to disconnect Discord')
      }
    } catch (err) {
      setError('Failed to disconnect Discord')
    }
  }

  const handleAddMapping = async () => {
    if (!newTier || (!newRoleId && !createNewRole) || (createNewRole && !newRoleName)) {
      return
    }

    try {
      const response = await fetch('/api/discord/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_tier: newTier,
          discord_role_id: createNewRole ? undefined : newRoleId,
          discord_role_name: createNewRole ? newRoleName : discordRoles.find(r => r.id === newRoleId)?.name,
          create_new_role: createNewRole,
        }),
      })

      if (response.ok) {
        await fetchDiscordData()
        setShowAddMapping(false)
        setNewTier('')
        setNewRoleId('')
        setNewRoleName('')
        setCreateNewRole(false)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to add mapping')
      }
    } catch (err) {
      setError('Failed to add mapping')
    }
  }

  const handleDeleteMapping = async (mappingId: string) => {
    try {
      const response = await fetch(`/api/discord/roles?id=${mappingId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setMappings(mappings.filter(m => m.id !== mappingId))
      } else {
        setError('Failed to delete mapping')
      }
    } catch (err) {
      setError('Failed to delete mapping')
    }
  }

  const handleUpdateBehavior = async (behavior: 'remove_roles' | 'kick') => {
    try {
      const response = await fetch('/api/discord/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ on_cancel_behavior: behavior }),
      })

      if (response.ok && guild) {
        setGuild({ ...guild, on_cancel_behavior: behavior })
      }
    } catch (err) {
      setError('Failed to update settings')
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/discord/sync', {
        method: 'POST',
      })
      const data = await response.json()

      if (response.ok) {
        alert(`Synced ${data.results.synced} of ${data.results.total} subscribers`)
        await fetchStats()
      } else {
        setError(data.error || 'Sync failed')
      }
    } catch (err) {
      setError('Failed to sync roles')
    } finally {
      setSyncing(false)
    }
  }

  const copyConnectUrl = () => {
    navigator.clipboard.writeText(connectUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#e07a42] animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-[#5865F2]" />
          Discord Integration
        </h1>
        <p className="text-[#71717a]">
          Connect your Discord server to automatically manage subscriber roles
        </p>
      </div>

      {/* Success Message */}
      {justConnected && (
        <div className="mb-6 p-4 rounded-xl bg-[#5CB87A]/10 border border-[#5CB87A]/20 text-[#5CB87A]">
          Discord connected successfully! Now set up your role mappings below.
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-sm hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-8 max-w-4xl">
        {!connected ? (
          /* Not Connected State */
          <section className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#5865F2]/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-[#5865F2]" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Connect Your Discord Server</h2>
            <p className="text-[#71717a] mb-6 max-w-md mx-auto">
              Add the MemberLink bot to your Discord server to automatically manage subscriber access and roles.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
            >
              {connecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <MessageSquare className="w-5 h-5" />
              )}
              {connecting ? 'Connecting...' : 'Connect Discord'}
            </button>
          </section>
        ) : (
          <>
            {/* Connected Server Info */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#5865F2]" />
                Connected Server
              </h2>
              <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {guild?.icon ? (
                      <img
                        src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                        alt={guild.name}
                        className="w-14 h-14 rounded-xl"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-[#5865F2]/10 flex items-center justify-center">
                        <MessageSquare className="w-7 h-7 text-[#5865F2]" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-medium text-white">{guild?.name}</h3>
                      <p className="text-sm text-[#71717a]">Server ID: {guild?.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="px-4 py-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors text-sm"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </section>

            {/* Stats */}
            {stats && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#e07a42]" />
                  Connection Stats
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-4">
                    <p className="text-sm text-[#71717a]">Total Subscribers</p>
                    <p className="text-2xl font-bold text-white">{stats.total_subscribers}</p>
                  </div>
                  <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-4">
                    <p className="text-sm text-[#71717a]">Connected</p>
                    <p className="text-2xl font-bold text-[#5865F2]">{stats.connected_subscribers}</p>
                  </div>
                  <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-4">
                    <p className="text-sm text-[#71717a]">In Server</p>
                    <p className="text-2xl font-bold text-[#5CB87A]">{stats.in_guild_count}</p>
                  </div>
                  <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-4">
                    <p className="text-sm text-[#71717a]">Connection Rate</p>
                    <p className="text-2xl font-bold text-[#e07a42]">{stats.connection_rate}%</p>
                  </div>
                </div>
              </section>
            )}

            {/* Customer Connect Link */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-[#e07a42]" />
                Customer Connect Link
              </h2>
              <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6">
                <p className="text-sm text-[#71717a] mb-3">
                  Share this link with your customers so they can connect their Discord account:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={connectUrl}
                    className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-lg text-white font-mono text-sm"
                  />
                  <button
                    onClick={copyConnectUrl}
                    className="px-4 py-2 bg-[#e07a42] hover:bg-[#c86a35] text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <a
                    href={connectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.05)] text-white rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </section>

            {/* Role Mappings */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#e07a42]" />
                  Role Mappings
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="px-4 py-2 border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.05)] text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Sync All'}
                  </button>
                  <button
                    onClick={() => setShowAddMapping(true)}
                    className="px-4 py-2 bg-[#e07a42] hover:bg-[#c86a35] text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Mapping
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] overflow-hidden">
                {mappings.length === 0 ? (
                  <div className="p-8 text-center text-[#71717a]">
                    <p>No role mappings configured yet.</p>
                    <p className="text-sm mt-1">Add a mapping to automatically assign roles to subscribers.</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-[rgba(255,255,255,0.02)]">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-[#71717a]">Subscription Tier</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-[#71717a]">Discord Role</th>
                        <th className="px-6 py-3 text-right text-sm font-medium text-[#71717a]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(255,255,255,0.06)]">
                      {mappings.map((mapping) => (
                        <tr key={mapping.id}>
                          <td className="px-6 py-4 text-white font-medium">{mapping.subscription_tier}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#5865F2]/10 text-[#5865F2] text-sm">
                              @{mapping.discord_role_name}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteMapping(mapping.id)}
                              className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Add Mapping Modal */}
              {showAddMapping && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-[#1a1a1a] rounded-xl border border-[rgba(255,255,255,0.1)] p-6 w-full max-w-md">
                    <h3 className="text-lg font-semibold text-white mb-4">Add Role Mapping</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-[#71717a] mb-1">Subscription Tier</label>
                        <input
                          type="text"
                          value={newTier}
                          onChange={(e) => setNewTier(e.target.value)}
                          placeholder="e.g., monthly, quarterly, default"
                          className="w-full px-4 py-2 bg-[#252525] border border-[rgba(255,255,255,0.1)] rounded-lg text-white"
                        />
                        <p className="text-xs text-[#71717a] mt-1">
                          Use &quot;default&quot; or &quot;active&quot; to match all active subscribers
                        </p>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm text-[#71717a] mb-2">
                          <input
                            type="checkbox"
                            checked={createNewRole}
                            onChange={(e) => setCreateNewRole(e.target.checked)}
                            className="rounded"
                          />
                          Create new Discord role
                        </label>

                        {createNewRole ? (
                          <input
                            type="text"
                            value={newRoleName}
                            onChange={(e) => setNewRoleName(e.target.value)}
                            placeholder="New role name"
                            className="w-full px-4 py-2 bg-[#252525] border border-[rgba(255,255,255,0.1)] rounded-lg text-white"
                          />
                        ) : (
                          <select
                            value={newRoleId}
                            onChange={(e) => setNewRoleId(e.target.value)}
                            className="w-full px-4 py-2 bg-[#252525] border border-[rgba(255,255,255,0.1)] rounded-lg text-white"
                          >
                            <option value="">Select a role</option>
                            {discordRoles.map((role) => (
                              <option key={role.id} value={role.id}>
                                @{role.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        onClick={() => {
                          setShowAddMapping(false)
                          setNewTier('')
                          setNewRoleId('')
                          setNewRoleName('')
                          setCreateNewRole(false)
                        }}
                        className="px-4 py-2 text-[#71717a] hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddMapping}
                        className="px-4 py-2 bg-[#e07a42] hover:bg-[#c86a35] text-white rounded-lg transition-colors"
                      >
                        Add Mapping
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Cancellation Behavior */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#e07a42]" />
                Cancellation Behavior
              </h2>
              <div className="rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] p-6">
                <p className="text-sm text-[#71717a] mb-4">
                  What should happen when a subscriber cancels their subscription?
                </p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-[rgba(255,255,255,0.1)] cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <input
                      type="radio"
                      name="cancel_behavior"
                      checked={guild?.on_cancel_behavior === 'remove_roles'}
                      onChange={() => handleUpdateBehavior('remove_roles')}
                      className="text-[#e07a42]"
                    />
                    <div>
                      <p className="text-white font-medium">Remove roles only</p>
                      <p className="text-sm text-[#71717a]">
                        Keep them in the server but remove subscription roles
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-[rgba(255,255,255,0.1)] cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <input
                      type="radio"
                      name="cancel_behavior"
                      checked={guild?.on_cancel_behavior === 'kick'}
                      onChange={() => handleUpdateBehavior('kick')}
                      className="text-[#e07a42]"
                    />
                    <div>
                      <p className="text-white font-medium">Kick from server</p>
                      <p className="text-sm text-[#71717a]">
                        Remove them from the Discord server entirely
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

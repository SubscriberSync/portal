'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Search,
  Settings2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Edit2,
  Trash2,
  GitMerge,
  MoreHorizontal,
  Check,
  X,
  User,
  AlertCircle,
  Star,
  Gift,
  AlertTriangle,
} from 'lucide-react'

// Column configuration
export interface ColumnConfig {
  id: string
  label: string
  accessor: string | ((row: SubscriberRow) => React.ReactNode)
  sortable?: boolean
  defaultVisible?: boolean
  width?: string
}

export interface SubscriberRow {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  status: string
  box_number?: number
  current_episode?: number
  sku?: string
  frequency?: string
  is_vip?: boolean
  is_influencer?: boolean
  is_problem?: boolean
  is_gift?: boolean
  is_at_risk?: boolean
  tags?: string[]
  shopify_customer_id?: string
  recharge_customer_id?: string
  discord_username?: string
  created_at?: string
  subscribed_at?: string
  address1?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  needs_review?: boolean
  review_reasons?: string[]
  tier_name?: string
  story_name?: string
}

interface SubscriberDataTableProps {
  data: SubscriberRow[]
  isLoading?: boolean
  context: 'import' | 'subscribers'
  onEdit?: (subscriber: SubscriberRow) => void
  onDelete?: (subscriber: SubscriberRow) => void
  onMerge?: (subscriber: SubscriberRow) => void
  onBulkDelete?: (ids: string[]) => void
  onBulkMerge?: (ids: string[]) => void
  onRefresh?: () => void
  searchPlaceholder?: string
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'name',
    label: 'Name',
    accessor: (row) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-background-elevated flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-foreground-tertiary" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-foreground truncate">
            {row.first_name || row.last_name
              ? `${row.first_name || ''} ${row.last_name || ''}`.trim()
              : 'Unknown'}
          </div>
          <div className="text-xs text-foreground-tertiary truncate">{row.email}</div>
        </div>
      </div>
    ),
    sortable: true,
    defaultVisible: true,
    width: '220px',
  },
  {
    id: 'email',
    label: 'Email',
    accessor: 'email',
    sortable: true,
    defaultVisible: false,
  },
  {
    id: 'status',
    label: 'Status',
    accessor: (row) => <StatusBadge status={row.status} />,
    sortable: true,
    defaultVisible: true,
    width: '100px',
  },
  {
    id: 'episode',
    label: 'Episode',
    accessor: (row) => (
      <span className="font-medium">
        {row.current_episode ?? row.box_number ?? '-'}
      </span>
    ),
    sortable: true,
    defaultVisible: true,
    width: '80px',
  },
  {
    id: 'tier',
    label: 'Tier',
    accessor: (row) => row.tier_name || row.sku || '-',
    sortable: true,
    defaultVisible: true,
    width: '100px',
  },
  {
    id: 'flags',
    label: 'Flags',
    accessor: (row) => <FlagBadges row={row} />,
    defaultVisible: true,
    width: '120px',
  },
  {
    id: 'phone',
    label: 'Phone',
    accessor: 'phone',
    defaultVisible: false,
  },
  {
    id: 'address',
    label: 'Address',
    accessor: (row) =>
      row.city && row.state ? `${row.city}, ${row.state}` : '-',
    defaultVisible: false,
  },
  {
    id: 'shopify_id',
    label: 'Shopify ID',
    accessor: 'shopify_customer_id',
    defaultVisible: false,
  },
  {
    id: 'recharge_id',
    label: 'Recharge ID',
    accessor: 'recharge_customer_id',
    defaultVisible: false,
  },
  {
    id: 'discord',
    label: 'Discord',
    accessor: 'discord_username',
    defaultVisible: false,
  },
  {
    id: 'tags',
    label: 'Tags',
    accessor: (row) =>
      row.tags && row.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {row.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-xs bg-accent/10 text-accent rounded"
            >
              {tag}
            </span>
          ))}
          {row.tags.length > 2 && (
            <span className="text-xs text-foreground-tertiary">
              +{row.tags.length - 2}
            </span>
          )}
        </div>
      ) : (
        '-'
      ),
    defaultVisible: false,
  },
  {
    id: 'created',
    label: 'Created',
    accessor: (row) =>
      row.subscribed_at || row.created_at
        ? new Date(row.subscribed_at || row.created_at!).toLocaleDateString()
        : '-',
    sortable: true,
    defaultVisible: false,
  },
]

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Active: 'bg-green-100 text-green-700',
    active: 'bg-green-100 text-green-700',
    Paused: 'bg-yellow-100 text-yellow-700',
    paused: 'bg-yellow-100 text-yellow-700',
    Cancelled: 'bg-red-100 text-red-700',
    cancelled: 'bg-red-100 text-red-700',
    churned: 'bg-red-100 text-red-700',
    Expired: 'bg-gray-100 text-gray-700',
    completed: 'bg-blue-100 text-blue-700',
  }

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-700'}`}
    >
      {status}
    </span>
  )
}

function FlagBadges({ row }: { row: SubscriberRow }) {
  const flags = []

  if (row.needs_review) {
    flags.push(
      <span
        key="review"
        title="Needs Review"
        className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center"
      >
        <AlertCircle className="w-3 h-3 text-amber-600" />
      </span>
    )
  }
  if (row.is_vip) {
    flags.push(
      <span
        key="vip"
        title="VIP"
        className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center"
      >
        <Star className="w-3 h-3 text-purple-600" />
      </span>
    )
  }
  if (row.is_gift) {
    flags.push(
      <span
        key="gift"
        title="Gift"
        className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center"
      >
        <Gift className="w-3 h-3 text-pink-600" />
      </span>
    )
  }
  if (row.is_at_risk || row.is_problem) {
    flags.push(
      <span
        key="risk"
        title={row.is_problem ? 'Problem Customer' : 'At Risk'}
        className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center"
      >
        <AlertTriangle className="w-3 h-3 text-red-600" />
      </span>
    )
  }

  if (flags.length === 0) return <span className="text-foreground-tertiary">-</span>

  return <div className="flex items-center gap-1">{flags}</div>
}

export default function SubscriberDataTable({
  data,
  isLoading = false,
  context,
  onEdit,
  onDelete,
  onMerge,
  onBulkDelete,
  onBulkMerge,
  onRefresh,
  searchPlaceholder = 'Search by name or email...',
}: SubscriberDataTableProps) {
  const [search, setSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    // Load from localStorage or use defaults
    const storageKey = `subscriber-columns-${context}`
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        return new Set(JSON.parse(saved))
      }
    }
    return new Set(
      DEFAULT_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id)
    )
  })
  const [showColumnMenu, setShowColumnMenu] = useState(false)

  // Save column preferences
  useEffect(() => {
    const storageKey = `subscriber-columns-${context}`
    localStorage.setItem(storageKey, JSON.stringify([...visibleColumns]))
  }, [visibleColumns, context])

  // Filter data by search
  const filteredData = useMemo(() => {
    if (!search.trim()) return data

    const searchLower = search.toLowerCase()
    return data.filter(
      (row) =>
        row.email?.toLowerCase().includes(searchLower) ||
        row.first_name?.toLowerCase().includes(searchLower) ||
        row.last_name?.toLowerCase().includes(searchLower) ||
        `${row.first_name} ${row.last_name}`.toLowerCase().includes(searchLower)
    )
  }, [data, search])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData

    return [...filteredData].sort((a, b) => {
      let aVal: unknown = a[sortColumn as keyof SubscriberRow]
      let bVal: unknown = b[sortColumn as keyof SubscriberRow]

      // Handle name sorting
      if (sortColumn === 'name') {
        aVal = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase()
        bVal = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase()
      }

      if (aVal === bVal) return 0
      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      const comparison = aVal < bVal ? -1 : 1
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredData, sortColumn, sortDirection])

  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnId)
      setSortDirection('asc')
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedData.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedData.map((r) => r.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleColumn = (columnId: string) => {
    const newVisible = new Set(visibleColumns)
    if (newVisible.has(columnId)) {
      newVisible.delete(columnId)
    } else {
      newVisible.add(columnId)
    }
    setVisibleColumns(newVisible)
  }

  const visibleColumnConfigs = DEFAULT_COLUMNS.filter((c) =>
    visibleColumns.has(c.id)
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
          />
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground-secondary">
              {selectedIds.size} selected
            </span>
            {onBulkMerge && selectedIds.size === 2 && (
              <button
                onClick={() => onBulkMerge([...selectedIds])}
                className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1"
              >
                <GitMerge className="w-4 h-4" />
                Merge
              </button>
            )}
            {onBulkDelete && (
              <button
                onClick={() => onBulkDelete([...selectedIds])}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-sm text-foreground-secondary hover:bg-background-elevated rounded-lg"
            >
              Clear
            </button>
          </div>
        )}

        {/* Column Visibility */}
        <div className="relative">
          <button
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-background-elevated flex items-center gap-2"
          >
            <Settings2 className="w-4 h-4" />
            Columns
            <ChevronDown className="w-4 h-4" />
          </button>

          {showColumnMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowColumnMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-56 bg-background border border-border rounded-lg shadow-lg z-20 py-2">
                <div className="px-3 py-1.5 text-xs font-medium text-foreground-tertiary uppercase">
                  Visible Columns
                </div>
                {DEFAULT_COLUMNS.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => toggleColumn(col.id)}
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-background-elevated flex items-center justify-between"
                  >
                    <span>{col.label}</span>
                    {visibleColumns.has(col.id) && (
                      <Check className="w-4 h-4 text-accent" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-elevated">
              <tr>
                {/* Checkbox column */}
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={
                      selectedIds.size > 0 &&
                      selectedIds.size === sortedData.length
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-border"
                  />
                </th>
                {visibleColumnConfigs.map((col) => (
                  <th
                    key={col.id}
                    className={`px-3 py-3 text-left text-xs font-medium text-foreground-secondary uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:text-foreground' : ''}`}
                    style={{ width: col.width }}
                    onClick={() => col.sortable && handleSort(col.id)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortColumn === col.id && (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      )}
                    </div>
                  </th>
                ))}
                {/* Actions column */}
                <th className="w-24 px-3 py-3 text-right text-xs font-medium text-foreground-secondary uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={visibleColumnConfigs.length + 2}
                    className="px-3 py-12 text-center"
                  >
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-foreground-tertiary" />
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumnConfigs.length + 2}
                    className="px-3 py-12 text-center text-foreground-tertiary"
                  >
                    {search ? 'No matching subscribers found' : 'No subscribers'}
                  </td>
                </tr>
              ) : (
                sortedData.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-background-elevated transition-colors ${
                      row.needs_review ? 'bg-amber-50/50' : ''
                    }`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        className="w-4 h-4 rounded border-border"
                      />
                    </td>
                    {visibleColumnConfigs.map((col) => (
                      <td key={col.id} className="px-3 py-3 text-sm">
                        {typeof col.accessor === 'function'
                          ? col.accessor(row)
                          : (row[col.accessor as keyof SubscriberRow] as React.ReactNode) ||
                            '-'}
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            title="Edit"
                            className="p-1.5 text-foreground-tertiary hover:text-foreground hover:bg-background-elevated rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {onMerge && (
                          <button
                            onClick={() => onMerge(row)}
                            title="Merge"
                            className="p-1.5 text-foreground-tertiary hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <GitMerge className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            title="Delete"
                            className="p-1.5 text-foreground-tertiary hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-foreground-secondary">
        <span>
          Showing {sortedData.length} of {data.length} subscribers
        </span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-accent hover:underline"
          >
            Refresh
          </button>
        )}
      </div>
    </div>
  )
}

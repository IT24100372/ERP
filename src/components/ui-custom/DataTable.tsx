import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp, 
  ChevronDown,
  Search,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Column<T = any> {
  key: string;
  header: string;
  width?: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  searchable?: boolean;
  searchKeys?: string[];
  pageSize?: number;
  className?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T = any>({
  data,
  columns,
  keyExtractor,
  onView,
  onEdit,
  onDelete,
  searchable = true,
  searchKeys = [],
  pageSize = 10,
  className,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [activeRow, setActiveRow] = useState<string | null>(null);

  // Filter data based on search
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredData = searchable && searchQuery
    ? data.filter((item: any) => 
        searchKeys.some(key => {
          const value = item[key];
          return value && String(value).toLowerCase().includes(searchQuery.toLowerCase());
        })
      )
    : data;

  // Sort data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedData = sortConfig
    ? [...filteredData].sort((a: any, b: any) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue === undefined || bValue === undefined) return 0;
        if (aValue === null || bValue === null) return 0;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      })
    : filteredData;

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        return { key, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return null;
    });
  };

  const hasActions = onView || onEdit || onDelete;

  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 overflow-hidden", className)}>
      {/* Search Bar */}
      {searchable && (
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5a65]/20 focus:border-[#ff5a65] transition-all duration-300"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/50">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    "px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider",
                    column.sortable && "cursor-pointer hover:bg-gray-100 transition-colors",
                    column.width
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && sortConfig?.key === String(column.key) && (
                      sortConfig.direction === 'asc' 
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </th>
              ))}
              {hasActions && (
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <AnimatePresence mode="wait">
              {paginatedData.map((item, index) => (
                <motion.tr
                  key={keyExtractor(item)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onMouseEnter={() => setActiveRow(keyExtractor(item))}
                  onMouseLeave={() => setActiveRow(null)}
                  className={cn(
                    "group transition-colors duration-200",
                    activeRow === keyExtractor(item) ? "bg-gray-50" : "hover:bg-gray-50/50"
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className="px-6 py-4 whitespace-nowrap"
                    >
                      {column.render 
                        ? column.render(item)
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        : String((item as any)[column.key] ?? '-')
                      }
                    </td>
                  ))}
                  {hasActions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {onView && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onView(item)}
                            className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </motion.button>
                        )}
                        {onEdit && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onEdit(item)}
                            className="w-8 h-8 flex items-center justify-center bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </motion.button>
                        )}
                        {onDelete && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onDelete(item)}
                            className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        )}
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} entries
          </p>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <motion.button
                key={page}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors",
                  currentPage === page
                    ? "bg-[#ff5a65] text-white"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                )}
              >
                {page}
              </motion.button>
            ))}
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}

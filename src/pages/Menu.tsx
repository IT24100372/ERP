import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit,
  Eye,
  Clock,
  Image as ImageIcon,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { mockApi } from '@/services/mockApi';
import type { MenuItem, MenuItemAddOn, MenuItemVariant } from '@/types';
import { cn } from '@/lib/utils';
import { formatLKR } from '@/lib/currency';

type ModalMode = 'create' | 'edit' | 'view';

const emptyForm: Omit<MenuItem, 'id'> = {
  name: '',
  description: '',
  price: 0,
  category: 'Main Course',
  isAvailable: true,
  preparationTime: 15,
  ingredients: [],
  variants: [],
  addOns: [],
};

export function Menu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('view');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [editForm, setEditForm] = useState<Omit<MenuItem, 'id'>>(emptyForm);
  const [ingredientsInput, setIngredientsInput] = useState('');

  const [variantName, setVariantName] = useState('');
  const [variantOptionsInput, setVariantOptionsInput] = useState('');
  const [addOnName, setAddOnName] = useState('');
  const [addOnPrice, setAddOnPrice] = useState('0');

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      const data = await mockApi.getMenuItems();
      setMenuItems(data);
    } catch (error) {
      console.error('Failed to load menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const fromItems = Array.from(new Set(menuItems.map((item) => item.category))).sort();
    const merged = Array.from(new Set([...fromItems, ...customCategories])).sort();
    return ['All', ...merged];
  }, [menuItems, customCategories]);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'All') return menuItems;
    return menuItems.filter((item) => item.category === activeCategory);
  }, [menuItems, activeCategory]);

  const categoryCounts = useMemo(() => {
    return menuItems.reduce<Record<string, number>>((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
  }, [menuItems]);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedItem(null);
    setEditForm(emptyForm);
    setIngredientsInput('');
    setVariantName('');
    setVariantOptionsInput('');
    setAddOnName('');
    setAddOnPrice('0');
    setShowModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setModalMode('edit');
    setSelectedItem(item);
    setEditForm({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      isAvailable: item.isAvailable,
      preparationTime: item.preparationTime,
      ingredients: [...item.ingredients],
      variants: [...(item.variants || [])],
      addOns: [...(item.addOns || [])],
      image: item.image,
    });
    setIngredientsInput(item.ingredients.join(', '));
    setVariantName('');
    setVariantOptionsInput('');
    setAddOnName('');
    setAddOnPrice('0');
    setShowModal(true);
  };

  const openViewModal = (item: MenuItem) => {
    setModalMode('view');
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleAddCategory = () => {
    const value = newCategory.trim();
    if (!value) return;
    if (categories.includes(value)) {
      setNewCategory('');
      return;
    }
    setCustomCategories((current) => [...current, value]);
    setNewCategory('');
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this menu item?')) return;
    try {
      await mockApi.deleteMenuItem(id);
      await loadMenuItems();
    } catch (error) {
      console.error('Failed to delete menu item:', error);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await mockApi.updateMenuItem(item.id, { isAvailable: !item.isAvailable });
      await loadMenuItems();
    } catch (error) {
      console.error('Failed to update availability:', error);
    }
  };

  const handleAddVariant = () => {
    const name = variantName.trim();
    const options = variantOptionsInput
      .split(',')
      .map((option) => option.trim())
      .filter(Boolean);

    if (!name || options.length === 0) return;

    const variant: MenuItemVariant = { name, options };
    setEditForm((current) => ({
      ...current,
      variants: [...(current.variants || []), variant],
    }));

    setVariantName('');
    setVariantOptionsInput('');
  };

  const handleRemoveVariant = (index: number) => {
    setEditForm((current) => ({
      ...current,
      variants: (current.variants || []).filter((_, i) => i !== index),
    }));
  };

  const handleAddAddOn = () => {
    const name = addOnName.trim();
    const price = Number(addOnPrice);
    if (!name || Number.isNaN(price) || price < 0) return;

    const addOn: MenuItemAddOn = { name, price };
    setEditForm((current) => ({
      ...current,
      addOns: [...(current.addOns || []), addOn],
    }));

    setAddOnName('');
    setAddOnPrice('0');
  };

  const handleRemoveAddOn = (index: number) => {
    setEditForm((current) => ({
      ...current,
      addOns: (current.addOns || []).filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    if (!editForm.name.trim()) {
      alert('Item name is required.');
      return false;
    }
    if (!editForm.description.trim()) {
      alert('Description is required.');
      return false;
    }
    if (!editForm.category.trim()) {
      alert('Category is required.');
      return false;
    }
    if (editForm.price <= 0) {
      alert('Price must be greater than 0.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    const payload: Omit<MenuItem, 'id'> = {
      ...editForm,
      ingredients: ingredientsInput
        .split(',')
        .map((ingredient) => ingredient.trim())
        .filter(Boolean),
    };

    if (!validateForm()) return;

    try {
      if (modalMode === 'create') {
        await mockApi.createMenuItem(payload);
      }
      if (modalMode === 'edit' && selectedItem) {
        await mockApi.updateMenuItem(selectedItem.id, payload);
      }
      setShowModal(false);
      await loadMenuItems();
    } catch (error) {
      console.error('Failed to save menu item:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-[#ff5a65] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-[#151515]">Menu Management Module</h2>
          <p className="text-gray-500">Add, organize, customize, and control menu availability in real time</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#ff5a65] text-white rounded-xl hover:bg-[#ff5a65]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Item
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl border border-gray-100 p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-[#ff5a65]" />
          <h3 className="font-semibold text-[#151515]">Category Management</h3>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm transition-colors border',
                activeCategory === category
                  ? 'bg-[#151515] text-white border-[#151515]'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[#ff5a65]/40'
              )}
            >
              {category}
              {category !== 'All' && (
                <span className={cn('ml-2 text-xs', activeCategory === category ? 'text-white/80' : 'text-gray-400')}>
                  {categoryCounts[category] || 0}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            placeholder="Add category (e.g., Drinks, Desserts)"
            className="flex-1 h-10 px-3 rounded-xl border border-gray-200"
          />
          <button onClick={handleAddCategory} className="px-4 rounded-xl bg-[#151515] text-white text-sm">
            Add Category
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + index * 0.04 }}
            whileHover={{ y: -5, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)' }}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden group"
          >
            <div className="h-44 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                  onError={(event) => {
                    const fallback = `https://placehold.co/800x600/f3f4f6/111827?text=${encodeURIComponent(item.name)}`;
                    if (event.currentTarget.src !== fallback) {
                      event.currentTarget.src = fallback;
                    }
                  }}
                />
              ) : (
                <ImageIcon className="w-10 h-10 text-gray-300" />
              )}
              <div className="absolute inset-0 bg-black/10" />

              <div className="absolute top-3 left-3">
                <span
                  className={cn(
                    'px-2 py-1 rounded-lg text-xs font-medium',
                    item.isAvailable ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                  )}
                >
                  {item.isAvailable ? 'Available' : 'Disabled'}
                </span>
              </div>

              <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openViewModal(item)} className="w-8 h-8 rounded-lg bg-white shadow flex items-center justify-center">
                  <Eye className="w-4 h-4 text-gray-600" />
                </button>
                <button onClick={() => openEditModal(item)} className="w-8 h-8 rounded-lg bg-white shadow flex items-center justify-center">
                  <Edit className="w-4 h-4 text-blue-600" />
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="w-8 h-8 rounded-lg bg-white shadow flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[#151515] text-lg truncate whitespace-nowrap">{item.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                </div>
                <span className="text-xl font-bold text-[#ff5a65]">{formatLKR(item.price)}</span>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" /> {item.preparationTime} min
                </span>
                <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{item.category}</span>
              </div>

              <div className="flex flex-wrap gap-1">
                {(item.variants || []).slice(0, 2).map((variant, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg">
                    {variant.name}
                  </span>
                ))}
                {(item.addOns || []).slice(0, 2).map((addOn, idx) => (
                  <span key={idx} className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-lg">
                    +{addOn.name}
                  </span>
                ))}
              </div>

              <button
                onClick={() => handleToggleAvailability(item)}
                className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50"
              >
                {item.isAvailable ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-gray-500" />}
                {item.isAvailable ? 'Disable Item' : 'Enable Item'}
              </button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {filteredItems.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-500">
          No menu items found for this category yet.
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-[#151515]">
                  {modalMode === 'create' && 'Add Menu Item'}
                  {modalMode === 'edit' && 'Edit Menu Item'}
                  {modalMode === 'view' && selectedItem?.name}
                </h3>
                {modalMode !== 'view' && (
                  <button
                    onClick={() => setEditForm((current) => ({ ...current, isAvailable: !current.isAvailable }))}
                    className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-gray-200"
                  >
                    {editForm.isAvailable ? 'Available' : 'Disabled'}
                  </button>
                )}
              </div>

              <div className="p-6 overflow-y-auto max-h-[65vh]">
                {modalMode === 'view' && selectedItem ? (
                  <div className="space-y-4">
                    <p className="text-gray-600">{selectedItem.description}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-gray-50">
                        <p className="text-sm text-gray-500">Price</p>
                        <p className="text-xl font-bold text-[#ff5a65]">{formatLKR(selectedItem.price)}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-gray-50">
                        <p className="text-sm text-gray-500">Preparation Time</p>
                        <p className="text-xl font-bold text-[#151515]">{selectedItem.preparationTime} min</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Variants</p>
                      <div className="flex flex-wrap gap-2">
                        {(selectedItem.variants || []).map((variant, index) => (
                          <span key={index} className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm">
                            {variant.name}: {variant.options.join(', ')}
                          </span>
                        ))}
                        {(selectedItem.variants || []).length === 0 && (
                          <span className="text-sm text-gray-400">No variants configured</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Add-ons</p>
                      <div className="flex flex-wrap gap-2">
                        {(selectedItem.addOns || []).map((addOn, index) => (
                          <span key={index} className="px-3 py-1 rounded-lg bg-amber-50 text-amber-700 text-sm">
                            {addOn.name} ({formatLKR(addOn.price)})
                          </span>
                        ))}
                        {(selectedItem.addOns || []).length === 0 && (
                          <span className="text-sm text-gray-400">No add-ons configured</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                        <input
                          value={editForm.name}
                          onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                          value={editForm.category}
                          onChange={(event) => setEditForm((current) => ({ ...current, category: event.target.value }))}
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                        >
                          {categories.filter((category) => category !== 'All').map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.price}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, price: Number(event.target.value) || 0 }))
                          }
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (min)</label>
                        <input
                          type="number"
                          value={editForm.preparationTime}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, preparationTime: Number(event.target.value) || 0 }))
                          }
                          className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                        <button
                          onClick={() => setEditForm((current) => ({ ...current, isAvailable: !current.isAvailable }))}
                          className="w-full h-[42px] px-4 border border-gray-200 rounded-xl text-sm"
                        >
                          {editForm.isAvailable ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients (comma separated)</label>
                      <input
                        value={ingredientsInput}
                        onChange={(event) => setIngredientsInput(event.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                        placeholder="Tomato, Cheese, Basil"
                      />
                    </div>

                    <div className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                        <p className="font-semibold text-[#151515]">Customization - Variants</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 mb-3">
                        <input
                          value={variantName}
                          onChange={(event) => setVariantName(event.target.value)}
                          placeholder="Variant name (e.g., Size)"
                          className="px-3 py-2 border border-gray-200 rounded-xl"
                        />
                        <input
                          value={variantOptionsInput}
                          onChange={(event) => setVariantOptionsInput(event.target.value)}
                          placeholder="Options (e.g., Small, Medium, Large)"
                          className="px-3 py-2 border border-gray-200 rounded-xl"
                        />
                        <button onClick={handleAddVariant} className="px-3 rounded-xl bg-[#151515] text-white text-sm">
                          Add
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(editForm.variants || []).map((variant, index) => (
                          <div key={index} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                            <span className="text-sm text-blue-800">{variant.name}: {variant.options.join(', ')}</span>
                            <button onClick={() => handleRemoveVariant(index)} className="text-red-600 text-sm">
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border border-gray-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Plus className="w-4 h-4 text-amber-600" />
                        <p className="font-semibold text-[#151515]">Customization - Add-ons</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 mb-3">
                        <input
                          value={addOnName}
                          onChange={(event) => setAddOnName(event.target.value)}
                          placeholder="Add-on name"
                          className="px-3 py-2 border border-gray-200 rounded-xl"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={addOnPrice}
                          onChange={(event) => setAddOnPrice(event.target.value)}
                          placeholder="Price"
                          className="px-3 py-2 border border-gray-200 rounded-xl w-28"
                        />
                        <button onClick={handleAddAddOn} className="px-3 rounded-xl bg-[#151515] text-white text-sm">
                          Add
                        </button>
                      </div>
                      <div className="space-y-2">
                        {(editForm.addOns || []).map((addOn, index) => (
                          <div key={index} className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2">
                            <span className="text-sm text-amber-800">
                              {addOn.name} ({formatLKR(addOn.price)})
                            </span>
                            <button onClick={() => handleRemoveAddOn(index)} className="text-red-600 text-sm">
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600">
                  Close
                </button>
                {modalMode !== 'view' && (
                  <button onClick={handleSave} className="px-4 py-2 bg-[#ff5a65] text-white rounded-xl">
                    {modalMode === 'create' ? 'Create Item' : 'Save Changes'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import {
    Search,
    ChevronLeft,
    ChevronRight,
    X,
    SlidersHorizontal,
    Filter,
} from "lucide-react";

import { useState, useEffect, useCallback, useRef } from "react";

import Footer from "@/Components/Ui/Footer";
import Navbar from "@/Components/Ui/Navbar";
import { ProductCard } from "@/Components/Ui/ProductCard";
import { MobileSortModal } from "@/Components/BuyerPage/ShopPage/MobileSortModal";
import { MobileFilterModal } from "@/Components/BuyerPage/ShopPage/MobileFilterModal";
import { Button } from "@/Components/Ui/Button";
import SearchBar from "@/Components/Ui/SearchBar";

export default function ShopPage({ list_shoppingItem, list_categoryItem }) {
    const [priceRange, setPriceRange] = useState([0, 1000]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedConditions, setSelectedConditions] = useState([]);
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [selectedColors, setSelectedColors] = useState([]);
    const [sortBy, setSortBy] = useState("newest");
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedFilters, setExpandedFilters] = useState({
        categories: true,
        price: true,
        condition: true,
        size: false,
        color: false,
    });

    // New mobile-specific states
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const [showSortOptions, setShowSortOptions] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // State for products and pagination - Initialize with props
    const [products, setProducts] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [from, setFrom] = useState(0);
    const [to, setTo] = useState(0);
    const [loading, setLoading] = useState(false);

    // Refs for debounce
    const debounceTimeoutRef = useRef(null);
    const isInitialMount = useRef(true);

    // Extract unique values for filters from products
    const getUniqueValues = (key) => {
        if (!products.length) return [];
        const values = products.map((p) => p[key]).filter(Boolean);
        return [...new Set(values)];
    };

    const sizes = getUniqueValues("size");
    const colors = getUniqueValues("color");
    const conditions = ["like-new", "good", "excellent", "fair"]; // Standard conditions

    // Fixed fetchProducts function
    const fetchProducts = useCallback(
        async (page = 1) => {
            setLoading(true);

            // Build URL with proper array parameters
            const params = new URLSearchParams();
            params.append("page", page.toString());

            if (searchQuery) params.append("search", searchQuery);
            if (sortBy) params.append("sort_by", sortBy);

            // Handle arrays
            if (selectedCategories.length > 0) {
                selectedCategories.forEach((category) => {
                    params.append("categories[]", category);
                });
            }

            if (selectedConditions.length > 0) {
                selectedConditions.forEach((condition) => {
                    params.append("conditions[]", condition);
                });
            }

            if (selectedSizes.length > 0) {
                selectedSizes.forEach((size) => {
                    params.append("sizes[]", size);
                });
            }

            if (selectedColors.length > 0) {
                selectedColors.forEach((color) => {
                    params.append("colors[]", color);
                });
            }

            if (priceRange && priceRange.length === 2) {
                params.append("price_range[]", priceRange[0].toString());
                params.append("price_range[]", priceRange[1].toString());
            }

            try {
                const response = await fetch(
                    `/api/shopping?${new URLSearchParams(params)}`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Requested-With": "XMLHttpRequest",
                            "X-CSRF-TOKEN":
                                document
                                    .querySelector('meta[name="csrf-token"]')
                                    ?.getAttribute("content") || "",
                        },
                    },
                );

                if (response.ok) {
                    const data = await response.json();

                    if (data.success) {
                        setProducts(data.list_shoppingItem.data || []);
                        setCurrentPage(
                            data.list_shoppingItem.current_page || 1,
                        );
                        setLastPage(data.list_shoppingItem.last_page || 1);
                        setTotalProducts(data.list_shoppingItem.total || 0);
                        setFrom(data.list_shoppingItem.from || 0);
                        setTo(data.list_shoppingItem.to || 0);
                    }
                } else {
                    console.error("❌ HTTP error:", response.status);
                }
            } catch (error) {
                console.error("❌ Error fetching products:", error);
            } finally {
                setLoading(false);
            }
        },
        [
            searchQuery,
            sortBy,
            selectedCategories,
            selectedConditions,
            selectedSizes,
            selectedColors,
            priceRange,
        ],
    );

    // Proper debounced search function
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
            if (query.trim() === "") {
                fetchProducts(1, {});
            } else {
                fetchProducts(1, { search: query });
            }
        }, 500);
    };

    // Toggle functions for filters
    const toggleCategory = (category) => {
        setSelectedCategories((prev) =>
            prev.includes(category)
                ? prev.filter((c) => c !== category)
                : [...prev, category],
        );
    };

    const toggleCondition = (condition) => {
        setSelectedConditions((prev) =>
            prev.includes(condition)
                ? prev.filter((c) => c !== condition)
                : [...prev, condition],
        );
    };

    const toggleSize = (size) => {
        setSelectedSizes((prev) =>
            prev.includes(size)
                ? prev.filter((s) => s !== size)
                : [...prev, size],
        );
    };

    const toggleColor = (color) => {
        setSelectedColors((prev) =>
            prev.includes(color)
                ? prev.filter((c) => c !== color)
                : [...prev, color],
        );
    };

    // Apply filters (for mobile)
    const applyFilters = () => {
        setMobileFiltersOpen(false);
        fetchProducts(1);
    };

    // Reset all filters
    const resetFilters = () => {
        setPriceRange([0, 1000]);
        setSelectedCategories([]);
        setSelectedConditions([]);
        setSelectedSizes([]);
        setSelectedColors([]);
        setSortBy("newest");
        setSearchQuery("");
        fetchProducts(1);
    };

    // Toggle filter sections
    const toggleFilterSection = (section) => {
        setExpandedFilters((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    // Scroll to top function
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // Update page change handler
    const handlePageChange = (page) => {
        if (page >= 1 && page <= lastPage) {
            fetchProducts(page);
            scrollToTop();
        }
    };

    // Handle sort changes
    const handleSortChange = (sort) => {
        setSortBy(sort);
        setShowSortOptions(false);
        fetchProducts(1);
    };

    // Handle price range input changes
    const handlePriceInputChange = (index, value) => {
        const newPriceRange = [...priceRange];
        const numValue = value === "" ? 0 : parseInt(value) || 0;
        newPriceRange[index] = numValue;
        setPriceRange(newPriceRange);
    };

    const hasProducts = products && products.length > 0;

    // Generate page numbers for pagination
    const generatePageNumbers = () => {
        const pages = [];
        const maxVisiblePages = isMobile ? 3 : 5;

        let startPage = Math.max(
            1,
            currentPage - Math.floor(maxVisiblePages / 2),
        );
        let endPage = Math.min(lastPage, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return pages;
    };

    // Filter Section Component for Desktop
    const FilterSection = ({
        title,
        items,
        selectedItems,
        toggleFunction,
        filterType,
    }) => (
        <div className="border-b border-gray-200 py-4">
            <button
                onClick={() => toggleFilterSection(filterType)}
                className="flex items-center justify-between w-full text-left"
            >
                <h3 className="font-medium text-gray-900">{title}</h3>
                <svg
                    className={`w-5 h-5 text-gray-500 transform transition-transform ${
                        expandedFilters[filterType] ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                    />
                </svg>
            </button>

            {expandedFilters[filterType] && (
                <div className="mt-3 space-y-2">
                    {items.map((item) => (
                        <label
                            key={item}
                            className="flex items-center space-x-2 cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={selectedItems.includes(item)}
                                onChange={() => toggleFunction(item)}
                                className="rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                            />
                            <span className="text-sm text-gray-600 capitalize">
                                {item}
                            </span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );

    // Initialize with props data on component mount
    useEffect(() => {
        if (list_shoppingItem?.data) {
            setProducts(list_shoppingItem.data || []);
            setCurrentPage(list_shoppingItem.current_page || 1);
            setLastPage(list_shoppingItem.last_page || 1);
            setTotalProducts(list_shoppingItem.total || 0);
            setFrom(list_shoppingItem.from || 0);
            setTo(list_shoppingItem.to || 0);
        }
    }, [list_shoppingItem]);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        fetchProducts(1);
    }, [
        selectedCategories,
        selectedConditions,
        selectedSizes,
        selectedColors,
        priceRange,
        sortBy,
        fetchProducts,
    ]);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Navbar />

            {/* Search Icon Button - Mobile */}
            <button
                onClick={() => setIsSearchFocused(true)}
                className="fixed bottom-6 right-6 z-30 bg-pink-500 text-white p-3 rounded-full shadow-lg hover:bg-pink-600 transition-colors lg:hidden"
            >
                <Search className="w-5 h-5" />
            </button>

            {/* Search Modal - Mobile */}
            {isSearchFocused && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black bg-opacity-50"
                        onClick={() => setIsSearchFocused(false)}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[70vh] flex flex-col">
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
                        </div>
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Search Reloved Items
                                </h3>
                                <button
                                    onClick={() => setIsSearchFocused(false)}
                                    className="p-2 text-gray-500 hover:text-gray-700"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="What pre-loved treasure are you looking for?"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    autoFocus
                                    className="text-black w-full px-4 py-3 pl-12 rounded-2xl bg-gray-100 border-0 focus:ring-2 focus:ring-pink-500 focus:bg-white"
                                />
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <div className="px-6 py-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold text-gray-900">
                                        Quick Filters
                                    </h4>
                                    <button
                                        onClick={() => {
                                            setIsSearchFocused(false);
                                            setMobileFiltersOpen(true);
                                        }}
                                        className="flex items-center space-x-2 px-3 py-2 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-600"
                                    >
                                        <SlidersHorizontal className="w-4 h-4" />
                                        <span>All Filters</span>
                                    </button>
                                </div>
                                <div className="mb-6">
                                    <h5 className="text-sm font-medium text-gray-700 mb-3">
                                        Popular Categories
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                        {list_categoryItem
                                            ?.slice(0, 6)
                                            .map((category, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => {
                                                        toggleCategory(
                                                            category.category_name,
                                                        );
                                                        setIsSearchFocused(
                                                            false,
                                                        );
                                                    }}
                                                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                                                        selectedCategories.includes(
                                                            category.category_name,
                                                        )
                                                            ? "bg-pink-500 text-white"
                                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    }`}
                                                >
                                                    {category.category_name}
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content - No Banner */}
            <main className="flex-1 container mx-auto px-4 lg:px-24 py-8 mt-16 lg:mt-24">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Filters Sidebar - Desktop */}
                    <aside className="hidden lg:block w-80 flex-shrink-0">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-24">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                    <Filter className="w-5 h-5 mr-2 text-green-500" />
                                    Filters
                                </h2>
                                <button
                                    onClick={resetFilters}
                                    className="text-sm text-green-500 hover:text-green-600 font-medium"
                                >
                                    Clear all
                                </button>
                            </div>

                            {/* Price Range Filter */}
                            <div className="border-b border-gray-200 py-4">
                                <div className="relative mb-6">
                                    <input
                                        type="text"
                                        placeholder="What pre-loved treasure are you looking for?"
                                        value={searchQuery}
                                        onChange={handleSearchChange}
                                        autoFocus
                                        className="text-black w-full px-4 py-3 pl-12 rounded-2xl bg-gray-100 border-green-600 focus:ring-2 focus:ring-green-500 focus:bg-white"
                                    />
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                </div>

                                <button
                                    onClick={() => toggleFilterSection("price")}
                                    className="flex items-center justify-between w-full text-left"
                                >
                                    <h3 className="font-medium text-gray-900">
                                        Price Range
                                    </h3>
                                    <svg
                                        className={`w-5 h-5 text-gray-500 transform transition-transform ${
                                            expandedFilters.price
                                                ? "rotate-180"
                                                : ""
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </button>

                                {expandedFilters.price && (
                                    <div className="mt-4 space-y-4">
                                        <input
                                            type="range"
                                            min="0"
                                            max="1000"
                                            value={priceRange[1]}
                                            onChange={(e) =>
                                                setPriceRange([
                                                    0,
                                                    parseInt(e.target.value),
                                                ])
                                            }
                                            className="w-full accent-green-500"
                                        />
                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="1000"
                                                value={priceRange[0]}
                                                onChange={(e) =>
                                                    handlePriceInputChange(
                                                        0,
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-24 px-2 py-1 border border-gray-300 text-black rounded text-sm"
                                                placeholder="Min"
                                            />
                                            <span className="text-gray-500">
                                                -
                                            </span>
                                            <input
                                                type="text"
                                                min="0"
                                                max="1000"
                                                value={priceRange[1]}
                                                onChange={(e) =>
                                                    handlePriceInputChange(
                                                        1,
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-24 px-2 py-1 border border-gray-300 text-black rounded text-sm"
                                                placeholder="Max"
                                            />
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            Selected: Rm {priceRange[0]} - Rm
                                            {priceRange[1]}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Category Filter */}
                            <FilterSection
                                title="Category"
                                items={
                                    list_categoryItem?.map(
                                        (c) => c.category_name,
                                    ) || []
                                }
                                selectedItems={selectedCategories}
                                toggleFunction={toggleCategory}
                                filterType="categories"
                            />

                            {/* Condition Filter */}
                            <FilterSection
                                title="Condition"
                                items={conditions}
                                selectedItems={selectedConditions}
                                toggleFunction={toggleCondition}
                                filterType="condition"
                            />

                            {/* Size Filter */}
                            {sizes.length > 0 && (
                                <FilterSection
                                    title="Size"
                                    items={sizes}
                                    selectedItems={selectedSizes}
                                    toggleFunction={toggleSize}
                                    filterType="size"
                                />
                            )}

                            {/* Color Filter */}
                            {colors.length > 0 && (
                                <FilterSection
                                    title="Color"
                                    items={colors}
                                    selectedItems={selectedColors}
                                    toggleFunction={toggleColor}
                                    filterType="color"
                                />
                            )}
                        </div>
                    </aside>

                    {/* Products Section */}
                    <section className="flex-1">
                        {/* Results Header */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-1">
                                        {searchQuery
                                            ? `Results for "${searchQuery}"`
                                            : "Reloved Treasures"}
                                    </h2>
                                    <p className="text-sm text-gray-600">
                                        Showing {from}-{to} of {totalProducts}{" "}
                                        pre-loved items
                                    </p>
                                </div>
                                <div className="flex-row">
                                    <Button
                                        buttonText="Visual Search"
                                        variant="successSoft"
                                        className="mr-2"
                                    />
                                    <select
                                        value={sortBy}
                                        onChange={(e) =>
                                            handleSortChange(e.target.value)
                                        }
                                        className="text-black border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                                    >
                                        <option value="newest">
                                            Newest Arrivals
                                        </option>
                                        <option value="price-low">
                                            Price: Low to High
                                        </option>
                                        <option value="price-high">
                                            Price: High to Low
                                        </option>
                                        <option value="rating">
                                            Top Rated
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Sort Button */}
                        <div className="lg:hidden mb-4">
                            <button
                                onClick={() => setShowSortOptions(true)}
                                className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                Sort by: {sortBy.replace("-", " ")}
                            </button>
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="flex justify-center items-center py-12">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
                            </div>
                        )}

                        {/* Product Grid - 8 cards per row */}
                        {!loading && hasProducts ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
                                {products.map((product) => (
                                    <ProductCard
                                        key={product.product_id}
                                        product={product}
                                        selectedVariant={null}
                                    />
                                ))}
                            </div>
                        ) : (
                            !loading && (
                                <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-200">
                                    <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                        No pre-loved items found
                                    </h3>
                                    <p className="text-gray-600 mb-6">
                                        Try adjusting your search or filter
                                        criteria
                                    </p>
                                    <button
                                        onClick={resetFilters}
                                        className="bg-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            )
                        )}

                        {/* Pagination */}
                        {!loading && hasProducts && lastPage > 1 && (
                            <div className="flex justify-center mt-8">
                                <div className="flex items-center gap-1 lg:gap-2">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() =>
                                            handlePageChange(currentPage - 1)
                                        }
                                        className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4 text-pink-500" />
                                        <span className="hidden lg:inline text-black">
                                            Previous
                                        </span>
                                    </button>

                                    {generatePageNumbers().map((page) => (
                                        <button
                                            key={page}
                                            onClick={() =>
                                                handlePageChange(page)
                                            }
                                            className={`w-8 h-8 lg:w-10 lg:h-10 rounded-xl text-sm font-medium transition-colors ${
                                                currentPage === page
                                                    ? "bg-pink-500 text-white"
                                                    : "border border-gray-300 hover:bg-gray-50 text-gray-700"
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}

                                    <button
                                        disabled={currentPage === lastPage}
                                        onClick={() =>
                                            handlePageChange(currentPage + 1)
                                        }
                                        className="flex items-center gap-1 lg:gap-2 px-3 lg:px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                    >
                                        <span className="hidden lg:inline text-black">
                                            Next
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-pink-500" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {/* Mobile Filters Modal */}
            {mobileFiltersOpen && (
                <MobileFilterModal
                    applyFilters={applyFilters}
                    fetchProducts={fetchProducts}
                    handlePriceInputChange={handlePriceInputChange}
                    list_categoryItem={list_categoryItem}
                    priceRange={priceRange}
                    products={products}
                    resetFilters={resetFilters}
                    selectedCategories={selectedCategories}
                    selectedConditions={selectedConditions}
                    selectedSizes={selectedSizes}
                    selectedColors={selectedColors}
                    toggleCategory={toggleCategory}
                    toggleCondition={toggleCondition}
                    toggleSize={toggleSize}
                    toggleColor={toggleColor}
                    setMobileFiltersOpen={setMobileFiltersOpen}
                />
            )}

            {/* Mobile Sort Modal */}
            {showSortOptions && (
                <MobileSortModal
                    setShowSortOptions={setShowSortOptions}
                    sortBy={sortBy}
                    handleSortChange={handleSortChange}
                />
            )}

            <Footer />
        </div>
    );
}

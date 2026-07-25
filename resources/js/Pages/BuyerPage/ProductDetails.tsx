import React, { useState, useEffect, useCallback } from "react";
import {
    ShoppingCart,
    Star,
    Shield,
    Layers,
    ChevronRight,
    Loader2,
    AlertCircle,
    Truck,
    MessageCircle,
    Maximize2,
    ShoppingBag,
} from "lucide-react";
import { router, usePage } from "@inertiajs/react";
import axios from "axios";
import Swal from "sweetalert2";

// Import your existing components
import Navbar from "@/Components/Ui/Navbar";
import Footer from "@/Components/Ui/Footer";
import { MobileVariantsPanel } from "@/Components/BuyerPage/ProductDetails/MobileVariantsPanel";
import { ShowReviewModal } from "@/Components/BuyerPage/ProductDetails/ShowReviewModal";
import { ShowZoomModal } from "@/Components/BuyerPage/ProductDetails/ShowZoomModal";
import { ShowConversationModal } from "@/Components/BuyerPage/ProductDetails/ShowConversationModal";
import { ShowAllReviewsModal } from "@/Components/BuyerPage/ProductDetails/ShowAllReviewsModal";
import { ProductCarousel } from "@/Components/BuyerPage/ProductDetails/ProductCarousel";

import { AlertMessage } from "@/Components/HelperFunction/AlertMessage";

import { QuantitySelector } from "@/Components/BuyerPage/ProductDetails/QuantitySelector";
import { SaveWishlist } from "@/Components/HelperFunction/SaveWishlist";
import { MediaThumbnail } from "@/Components/BuyerPage/ProductDetails/MediaThumbnail";
import { GetSelectedVariant } from "@/Components/HelperFunction/GetSelectedVariant";

const Alert = ({ type, title, message }) => {
    const styles = {
        error: "bg-red-50 border-red-200 text-red-800",
    };

    return (
        <div
            className={`${styles[type]} border rounded-lg p-4 flex items-start gap-3`}
        >
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <div className="flex-1">
                <p className="font-medium">{title}</p>
                <p className="text-sm mt-1">{message}</p>
            </div>
        </div>
    );
};

const RatingStars = ({ rating, size = 16, showNumber = false, total }) => (
    <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
                <Star
                    key={i}
                    size={size}
                    className={
                        i < Math.floor(rating)
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                    }
                />
            ))}
        </div>
        {showNumber && (
            <div className="flex items-center gap-1.5">
                <span className="font-bold text-gray-900">
                    {rating.toFixed(1)}
                </span>
                {total && (
                    <span className="text-sm text-gray-500">({total})</span>
                )}
            </div>
        )}
    </div>
);

export default function ProductDetails({ product_info }) {
    const [activeTab, setActiveTab] = useState("specifications");
    const [selectedImage, setSelectedImage] = useState(
        product_info?.[0]?.product_image?.[0]?.image_path || "",
    );
    const [quantity, setQuantity] = useState(1);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [showConversationModal, setShowConversationModal] = useState(false);
    const [initialMessage, setInitialMessage] = useState("");
    const [isStartingConversation, setIsStartingConversation] = useState(false);
    const [loadingStates, setLoadingStates] = useState({
        addToCart: false,
        wishlist: false,
        buyNow: false,
    });
    const [variantError, setVariantError] = useState("");
    const [showMobileVariants, setShowMobileVariants] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);
    const [reviews, setReviews] = useState(
        () => product_info?.[0]?.ratings || [],
    );
    const [allReviews, setAllReviews] = useState([]);
    const [hasMoreReviews, setHasMoreReviews] = useState(true);
    const [isLoadingReviews, setIsLoadingReviews] = useState(false);
    const [currentReviewsPage, setCurrentReviewsPage] = useState(1);
    const [newReview, setNewReview] = useState({
        rating: 0,
        comment: "",
        images: [],
    });
    const [recommendations, setRecommendations] = useState([]);

    const { auth } = usePage().props;

    const product = product_info?.[0];

    const reviewCount = reviews.length;
    const hasVariants = product?.product_variant?.length > 0;
    const variants = product?.product_variant || [];
    const hasVideos = product?.product_video?.length > 0;
    const videos = product?.product_video || [];

    const averageRating =
        reviews.length > 0
            ? reviews.reduce((acc, review) => acc + (review.rating || 0), 0) /
              reviews.length
            : 0;

    const availableStock = selectedVariant
        ? selectedVariant.quantity
        : product?.product_quantity || 0;

    const filteredReviews = reviews.slice(0, 3);

    // Alert wrapper using SweetAlert2 for consistent styling and behavior across the app
    const showAlert = AlertMessage;

    // Use the SaveWishlist function directly for adding to cart, as it handles both wishlist and cart logic based on the context
    const handleAddToCart = async () => {
        SaveWishlist(product.product_id, selectedVariant, auth, quantity);
    };

    // Parse variant combination helper
    const parseVariantCombination = (variant) => {
        if (variant?.variant_combination) {
            try {
                return typeof variant.variant_combination === "string"
                    ? JSON.parse(variant.variant_combination)
                    : variant.variant_combination;
            } catch (e) {
                return {};
            }
        }
        return {};
    };

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    const increaseQty = () =>
        setQuantity((prev) => Math.min(prev + 1, availableStock));
    const decreaseQty = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

    const getVariantCombinationText = (variant) => {
        if (!variant) return "Standard";

        if (variant.variant_key) {
            return variant.variant_key;
        }

        const combination = parseVariantCombination(variant);
        if (Object.keys(combination).length > 0) {
            return Object.values(combination).join(" - ");
        }

        return "Standard";
    };

    const prepareCheckoutData = () => {
        if (!auth?.user) return [];

        const variantData = GetSelectedVariant({ selectedVariant, product });
        
        return [
            {
                user: { user_id: auth.user.user_id },
                product: {
                    product_id: product?.product_id,
                    product_name: product?.product_name,
                    product_price: parseFloat(product?.product_price),
                    product_quantity: product?.product_quantity,
                    product_image: product?.product_image[0] || {},
                    selected_quantity: quantity,
                    selected_variant: JSON.stringify(variantData),
                },
                seller: {
                    seller_id: product?.seller_id,
                },
            },
        ];
    };

    const handleBuyNow = async () => {
        if (!auth?.user) {
            AlertMessage(
                "warning",
                "Login Required",
                "Please login to continue with your purchase",
                "Login Now",
            ).then(
                (result) => result.isConfirmed && router.visit(route("login")),
            );
            return;
        }

        if (availableStock === 0) {
            showAlert(
                "error",
                "Out of Stock",
                "This product is currently out of stock.",
                "OK",
            );
            return;
        }

        if (hasVariants && !selectedVariant) {
            showAlert(
                "warning",
                "Variant Selection Required",
                "Please select a product variant before proceeding.",
                "Select Variant",
            );
            return;
        }

        setLoadingStates((prev) => ({ ...prev, buyNow: true }));

        try {
            const checkoutData = prepareCheckoutData();

            router.post(route("checkout-process"), {
                items: checkoutData,
                onError: (errors) => {
                    // Close the loading alert
                    Swal.close();
                    console.error("Error during buy now:", errors);
                    showAlert(
                        "error",
                        "Checkout Error",
                        "Something went wrong. Please try again.",
                        "OK",
                    );
                },
            });
        } catch (error) {
            // Close the loading alert in case of exception
            Swal.close();
            console.error("Error during buy now:", error);
            showAlert(
                "error",
                "Unexpected Error",
                "An unexpected error occurred. Please try again later.",
                "OK",
            );
        } finally {
            setLoadingStates((prev) => ({ ...prev, buyNow: false }));
        }
    };

    const handleAddReview = async (e) => {
        e.preventDefault();
        if (newReview.rating === 0 || !newReview.comment.trim()) return;

        try {
            const response = await axios.post(route("make-review"), {
                product_id: product?.product_id,
                rating: newReview.rating,
                comment: newReview.comment,
            });
            const newReviewData = response.data.review;
            const transformedReview = {
                id: newReviewData.id,
                rating: newReviewData.rating,
                comment: newReviewData.comment,
                user: {
                    profile_image: auth?.user?.profile_image || null,
                    name: "You",
                },
                created_at: newReviewData.created_at,
                user_id: newReviewData.user_id,
            };
            setReviews((prev) => [transformedReview, ...prev]);
            setAllReviews((prev) => [transformedReview, ...prev]);
            setNewReview({ rating: 0, comment: "", images: [] });
            setShowReviewModal(false);
            showAlert(
                "success",
                "Success",
                "Review submitted successfully!",
                "OK",
            );
        } catch (error) {
            console.error("Error submitting review:", error);
            showAlert(
                "error",
                "Error",
                "Something went wrong! Please try again later...",
                "OK",
            );
        }
    };

    const handleVariantSelect = (variant) => {
        if (!variant || variant.quantity <= 0) return;
        setSelectedVariant(variant);
        setQuantity(1);
        setVariantError("");
    };

    const loadAllReviews = useCallback(
        async (page = 1) => {
            if (isLoadingReviews) return;
            setIsLoadingReviews(true);
            try {
                const response = await axios.get(
                    `/api/product/${product?.product_id}/reviews`,
                    { params: { page, per_page: 10 } },
                );
                const newReviews = response.data.reviews || [];
                setAllReviews((prev) =>
                    page === 1 ? newReviews : [...prev, ...newReviews],
                );
                setHasMoreReviews(
                    response.data.hasMore ||
                        response.data.next_page_url !== null,
                );
                setCurrentReviewsPage(page);
            } catch (error) {
                console.error("Error loading reviews:", error);
                if (page === 1) setAllReviews(reviews);
            } finally {
                setIsLoadingReviews(false);
            }
        },
        [product?.product_id, reviews],
    );

    const getRecommendations = async () => {
        try {
            const res = await axios.post(route("recommend"), {
                product_id: product?.product_id,
            });
            const incoming = res.data.recommendations || [];
            const normalized = incoming
                .map((item) => {
                    const product = item.product || item;
                    return product
                        ? {
                              ...product,
                              similarity: item.similarity ?? product.similarity,
                              similarity_percentage:
                                  item.similarity_percentage ??
                                  product.similarity_percentage,
                              ai_confidence:
                                  item.ai_confidence ?? product.ai_confidence,
                          }
                        : null;
                })
                .filter(Boolean);
            setRecommendations(normalized);
        } catch (error) {
            console.error("Error fetching recommendations:", error);
        }
    };

    const checkWishlistStatus = useCallback(async () => {
        try {
            const response = await axios.get(
                route("get-wishlist", product?.product_id),
            );
            setIsWishlisted(response.data.is_wishlisted);
        } catch (error) {
            console.error("Error checking wishlist status:", error);
        }
    }, [product?.product_id]);

    const handleShowAllReviews = () => {
        setShowAllReviewsModal(true);
        if (allReviews.length === 0) loadAllReviews(1);
    };

    const loadMoreReviews = () => {
        if (isLoadingReviews || !hasMoreReviews) return;
        loadAllReviews(currentReviewsPage + 1);
    };

    const startConversation = async (e) => {
        e.preventDefault();
        if (isStartingConversation) return;
        if (!initialMessage.trim()) {
            showAlert(
                "warning",
                "Message Required",
                "Please enter a message to start the conversation.",
                "OK",
            );
            return;
        }
        if (!auth?.user) {
            showAlert(
                "warning",
                "Login Required",
                "Please login to chat with the seller",
                "Login Now",
            ).then(
                (result) => result.isConfirmed && router.visit(route("login")),
            );
            return;
        }
        if (auth?.user?.user_id === product?.seller?.user_id) {
            showAlert(
                "info",
                "Own Product",
                "This is your own product listing.",
                "OK",
            );
            return;
        }

        setIsStartingConversation(true);
        try {
            await axios.post(
                "/start-conversation",
                {
                    seller_id: product?.seller_id,
                    product_id: product?.product_id,
                    message: initialMessage,
                },
                { timeout: 10000 },
            );
            showAlert(
                "success",
                "Conversation Started",
                "Redirecting to chat...",
                "OK",
            ).then(() => {
                setShowConversationModal(false);
                setInitialMessage("");
                router.visit(route("buyer-chat"));
            });
        } catch (error) {
            console.error("Conversation error:", error);
            showAlert(
                "error",
                "Error",
                "Failed to start conversation. Please try again.",
                "OK",
            );
        } finally {
            setIsStartingConversation(false);
        }
    };

    // ============================================================================
    // EFFECTS
    // ============================================================================

    useEffect(() => {
        if (product) {
            getRecommendations();
            checkWishlistStatus();
            setAllReviews(reviews);
        }
    }, [product?.product_id]);

    // WebSocket for real-time reviews
    useEffect(() => {
        if (!product) return;
        const channel = window.Echo?.channel(`product.${product?.product_id}`);
        if (!channel) return;

        channel.listen(".ReviewsUpdate", (e) => {
            const newReviewData = e.review || e;
            const transformedReview = {
                id: newReviewData.id,
                rating: newReviewData.rating,
                comment: newReviewData.comment,
                user: {
                    name: newReviewData.user?.name || "Anonymous",
                    profile_image: newReviewData.user?.profile_image || null,
                },
                created_at: newReviewData.created_at,
                user_id: newReviewData.user_id,
            };
            setReviews((prev) =>
                prev.find((r) => r.id === transformedReview.id)
                    ? prev
                    : [transformedReview, ...prev],
            );
            setAllReviews((prev) =>
                prev.find((r) => r.id === transformedReview.id)
                    ? prev
                    : [transformedReview, ...prev],
            );
        });
        return () => channel.stopListening(".ReviewsUpdate");
    }, [product]);

    // ============================================================================
    // RENDER - EXACT DESIGN FROM IMAGE
    // ============================================================================

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="container mx-auto px-12 py-16 pb-16">
                {/* Main Product Section */}
                <div className="bg-white rounded-xl shadow-sm p-6 mt-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column - Images */}
                        <div>
                            {/* Main Image */}
                            <div className="bg-gray-100 rounded-lg p-8 flex justify-center mb-4 relative">
                                <img
                                    src={
                                        selectedImage
                                            ? `${import.meta.env.VITE_BASE_URL}${selectedImage}`
                                            : "/api/placeholder/400/320"
                                    }
                                    alt={product?.product_name}
                                    className="object-contain h-80"
                                />
                                <button
                                    onClick={() => setShowZoomModal(true)}
                                    className="absolute top-4 right-4 bg-white text-blue-500 p-2 rounded-full shadow-md hover:bg-gray-100"
                                >
                                    <Maximize2 size={18} />
                                </button>
                            </div>

                            {/* Thumbnails */}
                            <div className="flex space-x-2 overflow-x-auto">
                                {product?.product_image?.map((img, idx) => (
                                    <MediaThumbnail
                                        key={idx}
                                        src={`${import.meta.env.VITE_BASE_URL}${img.image_path}`}
                                        isSelected={
                                            selectedImage === img.image_path
                                        }
                                        onClick={() =>
                                            setSelectedImage(img.image_path)
                                        }
                                        index={idx}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Right Column - Product Info */}
                        <div>
                            {variantError && (
                                <Alert
                                    type="error"
                                    title="Error"
                                    message={variantError}
                                />
                            )}

                            <h1 className="text-2xl font-bold text-gray-800 mb-2">
                                {product?.product_name}
                            </h1>

                            {/* Rating */}
                            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                                <RatingStars
                                    rating={averageRating}
                                    size={16}
                                    showNumber
                                    total={reviewCount}
                                />
                                <span className="text-green-600 text-sm font-medium">
                                    Stock Available
                                </span>
                            </div>

                            {/* Price */}
                            <div className="mb-6">
                                <span className="text-3xl font-bold text-gray-900">
                                    RM{" "}
                                    {parseFloat(
                                        product?.product_price || 0,
                                    ).toFixed(2)}
                                </span>
                                {product?.original_price && (
                                    <span className="ml-3 text-lg text-gray-400 line-through">
                                        RM{" "}
                                        {parseFloat(
                                            product?.original_price,
                                        ).toFixed(2)}
                                    </span>
                                )}
                            </div>

                            <hr className="mb-6" />

                            {/* Variant Selection */}
                            {hasVariants && (
                                <div className="mb-6">
                                    <div className="mb-3">
                                        <span className="font-bold text-gray-700">
                                            Product Description:{" "}
                                            <span className="text-sm font-semibold text-gray-500">
                                                {product?.product_description ||
                                                    "Premium stability running shoe built with GEL technology and FlyteFoam cushioning for long-distance runs."}
                                            </span>
                                        </span>
                                    </div>

                                    {/* Variant Selection - Desktop */}
                                    {hasVariants && (
                                        <div className="hidden lg:block space-y-4 mb-6">
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <label className="font-semibold text-gray-900 flex items-center gap-2">
                                                        <Layers
                                                            size={18}
                                                            className="text-emerald-500"
                                                        />
                                                        Select Variant{" "}
                                                        <span className="text-red-500 ml-1">
                                                            *
                                                        </span>
                                                    </label>
                                                </div>
                                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                                    {variants.map((variant) => {
                                                        const combination =
                                                            parseVariantCombination(
                                                                variant,
                                                            );
                                                        return (
                                                            <button
                                                                key={
                                                                    variant.variant_id
                                                                }
                                                                onClick={() =>
                                                                    handleVariantSelect(
                                                                        variant,
                                                                    )
                                                                }
                                                                disabled={
                                                                    variant.quantity <=
                                                                    0
                                                                }
                                                                className={`p-4 rounded-2xl border-2 text-left transition-all transform hover:scale-[1.02] ${
                                                                    selectedVariant?.variant_id ===
                                                                    variant.variant_id
                                                                        ? "border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50 ring-4 ring-emerald-100 shadow-xl"
                                                                        : "border-slate-200 hover:border-emerald-300 bg-white hover:shadow-lg"
                                                                } ${variant.quantity <= 0 ? "opacity-50 cursor-not-allowed hover:scale-100" : ""}`}
                                                            >
                                                                <div className="font-bold text-gray-900 text-lg">
                                                                    {variant.variant_key ||
                                                                        combination.Colors ||
                                                                        "Standard"}
                                                                </div>
                                                                <div className="flex justify-between items-center mt-2">
                                                                    <span className="text-xl font-extrabold text-emerald-600">
                                                                        RM{" "}
                                                                        {parseFloat(
                                                                            variant.price,
                                                                        ).toFixed(
                                                                            2,
                                                                        )}
                                                                    </span>
                                                                    <span
                                                                        className={`text-xs font-medium px-2 py-1 rounded-full ${
                                                                            variant.quantity >
                                                                            0
                                                                                ? "bg-emerald-100 text-emerald-700"
                                                                                : "bg-red-100 text-red-700"
                                                                        }`}
                                                                    >
                                                                        {variant.quantity >
                                                                        0
                                                                            ? `${variant.quantity} left`
                                                                            : "Sold out"}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Mobile Variant Button */}
                                    {hasVariants && (
                                        <div className="lg:hidden mb-6">
                                            <button
                                                onClick={() =>
                                                    setShowMobileVariants(true)
                                                }
                                                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-2xl text-left hover:border-emerald-400 transition-all hover:shadow-lg bg-gradient-to-r from-gray-50 to-white"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-semibold text-gray-900 flex items-center gap-2">
                                                            <Layers
                                                                size={16}
                                                                className="text-emerald-500"
                                                            />
                                                            Selected Variant
                                                        </p>
                                                        <p
                                                            className={`text-sm font-bold mt-1 ${
                                                                selectedVariant
                                                                    ? "text-emerald-600"
                                                                    : "text-red-600"
                                                            }`}
                                                        >
                                                            {selectedVariant
                                                                ? getVariantCombinationText(
                                                                      selectedVariant,
                                                                  )
                                                                : "No variant selected"}
                                                        </p>
                                                    </div>
                                                    <ChevronRight
                                                        size={20}
                                                        className="text-gray-400"
                                                    />
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Quantity */}
                            <div className="mb-6">
                                <QuantitySelector
                                    quantity={quantity}
                                    onIncrease={increaseQty}
                                    onDecrease={decreaseQty}
                                    max={availableStock}
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col md:flex-row gap-3 mb-6">
                                <button
                                    onClick={handleAddToCart}
                                    disabled={
                                        loadingStates.addToCart ||
                                        (hasVariants && !selectedVariant)
                                    }
                                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loadingStates.addToCart ? (
                                        <Loader2
                                            size={18}
                                            className="animate-spin"
                                        />
                                    ) : (
                                        <ShoppingCart size={18} />
                                    )}
                                    {loadingStates.addToCart
                                        ? "Adding..."
                                        : "Add to Cart"}
                                </button>
                                <button
                                    onClick={handleBuyNow}
                                    className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <ShoppingBag size={18} />
                                    Buy Now
                                </button>
                            </div>

                            {/* Warranty */}
                            <div className="bg-blue-50 rounded-lg p-4 flex gap-3">
                                <Shield
                                    className="text-blue-600 flex-shrink-0"
                                    size={20}
                                />
                                <div>
                                    <p className="font-medium text-blue-900">
                                        Relove Market Warranty
                                    </p>
                                    <p className="text-sm text-blue-700">
                                        Product Refundable
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Delivery Options and Specifications */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    {/* Delivery Options */}
                    <div className="md:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm p-5">
                            <h3 className="font-semibold flex items-center gap-2 mb-4 text-black">
                                <Truck size={18} />
                                Delivery Options
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center pb-3 border-b">
                                    <div className="flex flex-col md:flex-row items-start gap-3">
                                        <input
                                            type="radio"
                                            name="delivery"
                                            defaultChecked
                                            className="mt-1"
                                        />
                                        <div>
                                            <p className="font-medium text-blue-600">
                                                Regular
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                JNE Reguler
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Estimate Arrive Time - 20 Dec
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-green-600 font-medium">
                                        RM 5.20
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex flex-col md:flex-row items-start gap-3">
                                        <input
                                            type="radio"
                                            name="delivery"
                                            className="mt-1"
                                        />
                                        <div>
                                            <p className="font-medium text-black">
                                                Instan
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                GoSend Bike
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Estimate arrive time - Today
                                            </p>
                                        </div>
                                    </div>
                                    <span className="font-medium text-green-600">
                                        RM 2.65
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                                <Shield size={12} /> Deliver to Parcel Locker
                            </p>
                        </div>
                    </div>

                    {/* Specifications with Tabs */}
                    <div className="md:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm p-5">
                            {/* Tab Headers */}
                            <div className="flex border-b border-gray-200 mb-4">
                                {[
                                    {
                                        id: "specifications",
                                        label: "Specifications",
                                    },
                                    { id: "features", label: "Features" },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-4 py-2 font-medium text-sm transition-colors relative ${
                                            activeTab === tab.id
                                                ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                                                : "text-gray-500 hover:text-gray-700"
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Specifications Tab Content */}
                            {activeTab === "specifications" && (
                                <>
                                    <h3 className="font-semibold mb-4 text-black">
                                        Specification
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                                        <div className="flex py-2 border-b border-gray-100">
                                            <span className="w-1/3 text-gray-500 text-sm">
                                                Condition
                                            </span>
                                            <span className="w-2/3 text-sm text-black font-medium">
                                                {product?.product_condition ||
                                                    "Excellent"}
                                            </span>
                                        </div>

                                        <div className="flex py-2 border-b border-gray-100">
                                            <span className="w-1/3 text-gray-500 text-sm">
                                                Color
                                            </span>
                                            <span className="w-2/3 text-sm font-medium text-black">
                                                {selectedVariant?.variant_key ||
                                                    (selectedVariant?.variant_combination
                                                        ? parseVariantCombination(
                                                              selectedVariant,
                                                          ).Colors
                                                        : "Pink")}
                                            </span>
                                        </div>
                                        <div className="flex py-2 border-b border-gray-100">
                                            <span className="w-1/3 text-gray-500 text-sm">
                                                Category
                                            </span>
                                            <span className="w-2/3 text-sm font-medium text-black">
                                                {product?.category
                                                    ?.category_name || "N/A"}
                                            </span>
                                        </div>
                                        <div className="flex py-2 border-b border-gray-100">
                                            <span className="w-1/3 text-gray-500 text-sm">
                                                Total Sold
                                            </span>
                                            <span className="w-2/3 text-sm font-medium text-black">
                                                {product?.order_items?.length ||
                                                    0}{" "}
                                                units
                                            </span>
                                        </div>
                                        <div className="flex py-2 border-b border-gray-100">
                                            <span className="w-1/3 text-gray-500 text-sm">
                                                Included Items
                                            </span>
                                            <span className="w-2/3 text-sm font-medium text-black">
                                                {product?.product_include_item
                                                    ?.map(
                                                        (item) =>
                                                            item.item_name,
                                                    )
                                                    .join(", ") ||
                                                    "Extra pair of insoles"}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Description Tab Content */}
                            {activeTab === "features" && (
                                <div className="flex py-2 border-b border-gray-100 mx-6">
                                    <span className="text-sm font-medium text-black">
                                        <ul className="list-disc list-inside space-y-1">
                                            {product?.product_feature &&
                                            product.product_feature.length >
                                                0 ? (
                                                product.product_feature.map(
                                                    (feature, index) => (
                                                        <li
                                                            key={index}
                                                            className="text-black"
                                                        >
                                                            {
                                                                feature.feature_text
                                                            }
                                                        </li>
                                                    ),
                                                )
                                            ) : (
                                                <li className="text-black">
                                                    N/A
                                                </li>
                                            )}
                                        </ul>
                                    </span>
                                </div>
                            )}

                            {/* Reviews Tab Content */}
                            {activeTab === "reviews" && (
                                <div className="py-2">
                                    {filteredReviews.length > 0 ? (
                                        <div className="space-y-4">
                                            {filteredReviews.map((review) => (
                                                <div
                                                    key={review.id}
                                                    className="border-b pb-3 last:border-0"
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-medium text-sm">
                                                            {review.user
                                                                ?.name ||
                                                                "Anonymous"}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(
                                                                review.created_at,
                                                            ).toLocaleDateString(
                                                                "id-ID",
                                                            )}
                                                        </span>
                                                    </div>
                                                    <RatingStars
                                                        rating={review.rating}
                                                        size={12}
                                                    />
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {review.comment}
                                                    </p>
                                                </div>
                                            ))}
                                            {reviewCount > 3 && (
                                                <button
                                                    onClick={
                                                        handleShowAllReviews
                                                    }
                                                    className="text-blue-600 text-xs font-medium hover:underline mt-2"
                                                >
                                                    Lihat semua ({reviewCount})
                                                    →
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-center py-4 text-sm">
                                            Belum ada ulasan
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Seller Info Card */}
                <div className="mt-6">
                    <div className="bg-white rounded-xl shadow-sm p-5">
                        <div className="flex flex-col justify-start md:flex-row md:justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                                    {product?.seller?.seller_store?.store_name?.charAt(
                                        0,
                                    ) || "E"}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-700">
                                        {product?.seller?.seller_store
                                            ?.store_name || "EcoChic Preloved"}
                                    </h4>
                                    <p className="text-sm text-gray-500">
                                        {product?.seller?.is_verified
                                            ? "Verified Seller"
                                            : "Seller"}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowConversationModal(true)}
                                className="flex mt-3 xs:w-full md:mt-0 items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <MessageCircle size={16} />
                                <span>Contact Sellers</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Reviews Section */}
                <div className="mt-6">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex flex-col md:flex-row items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg text-black">
                                Comment & Reviews
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-gray-600">
                                    {averageRating.toFixed(1)}
                                </span>
                                <RatingStars rating={averageRating} size={18} />
                            </div>
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 text-gray-600">
                            {[
                                "All",
                                "With Photo",
                                "Quality",
                                "Comfort",
                                "Ergonomis",
                            ].map((filter) => (
                                <button
                                    key={filter}
                                    className="px-4 py-1.5 border rounded-full text-sm whitespace-nowrap hover:bg-gray-50"
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowReviewModal(true)}
                            className="mb-6 text-blue-600 font-medium hover:underline"
                        >
                            Give Review →
                        </button>

                        {filteredReviews.length > 0 ? (
                            <div className="space-y-6">
                                {filteredReviews.map((review) => (
                                    <div
                                        key={review.id}
                                        className="border-b pb-4 last:border-0"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-gray-600">
                                                {review.user?.name ||
                                                    "Anonymous"}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {new Date(
                                                    review.created_at,
                                                ).toLocaleDateString("id-ID")}
                                            </span>
                                        </div>
                                        <RatingStars
                                            rating={review.rating}
                                            size={14}
                                        />
                                        <p className="text-sm text-gray-700 mt-2">
                                            {review.comment}
                                        </p>
                                    </div>
                                ))}
                                {reviewCount > 3 && (
                                    <button
                                        onClick={handleShowAllReviews}
                                        className="text-blue-600 text-sm font-medium hover:underline"
                                    >
                                        View all reviews ({reviewCount}) →
                                    </button>
                                )}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-8">
                                No reviews yet. Be the first to review this
                                product!
                            </p>
                        )}
                    </div>
                </div>

                {/* Related Products */}
                {recommendations.length > 0 && (
                    <div className="mt-6">
                        <ProductCarousel
                            products={recommendations}
                            title="You Might Also Like"
                        />
                    </div>
                )}
            </main>

            {/* Modals */}
            {showMobileVariants && (
                <MobileVariantsPanel
                    product_info={product_info}
                    selectedVariant={selectedVariant}
                    setShowMobileVariants={setShowMobileVariants}
                    handleVariantSelect={handleVariantSelect}
                    getVariantCombinationText={getVariantCombinationText}
                />
            )}

            {showAllReviewsModal && (
                <ShowAllReviewsModal
                    allReviews={allReviews}
                    hasMoreReviews={hasMoreReviews}
                    isLoadingReviews={isLoadingReviews}
                    reviewCount={reviewCount}
                    setShowAllReviewsModal={setShowAllReviewsModal}
                    loadMoreReviews={loadMoreReviews}
                />
            )}

            {showReviewModal && (
                <ShowReviewModal
                    setShowReviewModal={setShowReviewModal}
                    handleAddReview={handleAddReview}
                    setNewReview={setNewReview}
                    newReview={newReview}
                />
            )}

            {showZoomModal && (
                <ShowZoomModal
                    product_info={product_info}
                    setShowZoomModal={setShowZoomModal}
                    selectedImage={selectedImage}
                />
            )}

            {showConversationModal && (
                <ShowConversationModal
                    initialMessage={initialMessage}
                    setInitialMessage={setInitialMessage}
                    setShowConversationModal={setShowConversationModal}
                    startConversation={startConversation}
                />
            )}

            <Footer />
        </div>
    );
}

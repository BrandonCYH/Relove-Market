import { useEffect, useRef, useState } from "react";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import Carousel from "react-multi-carousel";

import "react-multi-carousel/lib/styles.css";

import { ProductCard } from "@/Components/Ui/ProductCard";

export function ProductCarousel({ products = [], title, save_wishlist }) {
    const items = Array.isArray(products) ? products : [];
    const carouselRef = useRef(null);
    const [showArrows, setShowArrows] = useState(items.length > 1);

    const responsive = {
        superLargeDesktop: {
            breakpoint: { max: 4000, min: 1280 },
            items: 4,
            partialVisibilityGutter: 40,
        },
        desktop: {
            breakpoint: { max: 1280, min: 1024 },
            items: 3,
            partialVisibilityGutter: 30,
        },
        tablet: {
            breakpoint: { max: 1024, min: 640 },
            items: 2,
            partialVisibilityGutter: 20,
        },
        mobile: {
            breakpoint: { max: 640, min: 0 },
            items: 1,
            partialVisibilityGutter: 10,
        },
    };

    useEffect(() => {
        setShowArrows(items.length > 1);
    }, [items.length]);

    const goToPrevious = () => {
        if (carouselRef.current && items.length > 1) {
            carouselRef.current.previous();
        }
    };

    const goToNext = () => {
        if (carouselRef.current && items.length > 1) {
            carouselRef.current.next();
        }
    };

    if (items.length === 0) {
        return null;
    }

    return (
        <section className="py-8">
            <div className="max-w-9xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                        {title || "Recommended Products"}
                    </h2>

                    {showArrows && (
                        <div className="hidden md:flex items-center gap-2">
                            <button
                                onClick={goToPrevious}
                                className="bg-white text-gray-700 p-3 rounded-full shadow-md hover:bg-gray-50 transition-all"
                                aria-label="Previous products"
                            >
                                <FaArrowLeft />
                            </button>
                            <button
                                onClick={goToNext}
                                className="bg-white text-gray-700 p-3 rounded-full shadow-md hover:bg-gray-50 transition-all"
                                aria-label="Next products"
                            >
                                <FaArrowRight />
                            </button>
                        </div>
                    )}
                </div>

                <div className="relative">
                    <Carousel
                        ref={carouselRef}
                        responsive={responsive}
                        infinite={items.length > 1}
                        autoPlay={false}
                        arrows={false}
                        renderButtonGroupOutside
                        itemClass="px-2"
                        containerClass="pb-6"
                        partialVisible
                        keyBoardControl
                        swipeable
                        draggable
                        shouldResetAutoplay={false}
                    >
                        {items.map((product) => (
                            <div key={product.product_id}>
                                <ProductCard product={product} />
                            </div>
                        ))}
                    </Carousel>

                    {showArrows && (
                        <div className="flex justify-center mt-4 md:hidden">
                            <button
                                onClick={goToPrevious}
                                className="bg-white text-gray-700 p-3 rounded-full shadow-md hover:bg-gray-50 mr-2"
                                aria-label="Previous products"
                            >
                                <FaArrowLeft />
                            </button>
                            <button
                                onClick={goToNext}
                                className="bg-white text-gray-700 p-3 rounded-full shadow-md hover:bg-gray-50"
                                aria-label="Next products"
                            >
                                <FaArrowRight />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

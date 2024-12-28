import React from "react";
import { useSelector } from "react-redux";
import ProductCard from "./ProductCard";

const RelatedProducts = () => {
  const { relatedProducts, loading } = useSelector((state) => state.recommendation);

  if (loading) {
    return <div className="text-center">Loading recommendations...</div>;
  }

  return (
    <div className="row">
      <div className="col-12">
        <h3 className="section-heading">Similar Products You May Like</h3>
      </div>
      <div className="row">
        <ProductCard data={relatedProducts.data} />
      </div>
    </div>
  );
};

export default RelatedProducts;
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

export const getRelatedProducts = createAsyncThunk(
  "recommendation/getRelatedProducts",
  async ({ category, brand, productId }, { rejectWithValue }) => {
    try {
      // alert(category);
      const response = await axios.post("http://localhost:5000/api/product/recommendations", {
        category,
        brand,
        excludeId: productId,
      });
      console.log("R:", response.data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);


const recommendationSlice = createSlice({
  name: "recommendation",
  initialState: {
    relatedProducts: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearRecommendations: (state) => {
      state.relatedProducts = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getRelatedProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(getRelatedProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.relatedProducts = action.payload;
        state.error = null;
      })
      .addCase(getRelatedProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearRecommendations } = recommendationSlice.actions;
export default recommendationSlice.reducer;
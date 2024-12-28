import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BiArrowBack } from "react-icons/bi";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Modal } from "antd";
import Container from "../components/Container";
import { useDispatch, useSelector } from "react-redux";
import { useFormik } from "formik";
import * as yup from "yup";
import axios from "axios";
import { config } from "../utils/axiosConfig";
import {
  createAnOrder,
  deleteUserCart,
  getUserCart,
  resetState,
} from "../features/user/userSlice";
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';


// Initialize Stripe - Replace with your publishable key
const stripePromise = loadStripe('pk_test_51QYLJg02VlIBdNbat6Ny2dEfDKnXhLqpF0QGsW1FaROukFWtfVl9F7KIycaE99lchgsDGo6sIQ8HS4c0WPaqcKYg00HEFUdyda');

// Keep existing shipping schema
let shippingSchema = yup.object({
  firstname: yup.string().required("First Name is Required"),
  lastname: yup.string().required("Last Name is Required"),
  address: yup.string().required("Address Details are Required"),
  state: yup.string().required("State is Required"),
  city: yup.string().required("City is Required"),
  country: yup.string().required("Country is Required"),
  pincode: yup.number().required("Pincode is Required").positive().integer(),
});

const Checkout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cartState = useSelector((state) => state?.auth?.cartProducts);
  const authState = useSelector((state) => state?.auth);
  const [totalAmount, setTotalAmount] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cartProductState, setCartProductState] = useState([]);

  //
  const PaymentForm = ({ onSuccess, amount }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(false);
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      
      if (!stripe || !elements) {
        return;
      }
  
      setProcessing(true);
  
      try {
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
          },
        });
  
        if (error) {
          setError(error.message);
        } else {
          onSuccess(paymentIntent);
        }
      } catch (err) {
        setError("Payment failed. Please try again.");
      }
      
      setProcessing(false);
    };
  
    return (
      <form onSubmit={handleSubmit} className="payment-form">
        <div className="mb-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
        
        {error && (
          <div className="text-red-500 mb-4">
            {error}
          </div>
        )}
  
        <button
          type="submit"
          disabled={!stripe || processing}
          className="button w-full"
        >
          {processing ? 'Processing...' : `Pay Rs ${amount}`}
        </button>
      </form>
    );
  };
  

  useEffect(() => {
    let sum = 0;
    for (let index = 0; index < cartState?.length; index++) {
      sum = sum + Number(cartState[index].quantity) * cartState[index].price;
      setTotalAmount(sum);
    }
  }, [cartState]);

  const getTokenFromLocalStorage = localStorage.getItem("customer")
    ? JSON.parse(localStorage.getItem("customer"))
    : null;

  const config2 = {
    headers: {
      Authorization: `Bearer ${
        getTokenFromLocalStorage !== null ? getTokenFromLocalStorage.token : ""
      }`,
      Accept: "application/json",
    },
  };

  useEffect(() => {
    dispatch(getUserCart(config2));
  }, []);

  useEffect(() => {
    if (
      authState?.orderedProduct?.order !== null &&
      authState?.orderedProduct?.success === true
    ) {
      navigate("/my-orders");
    }
  }, [authState]);

  const formik = useFormik({
    initialValues: {
      firstname: "",
      lastname: "",
      address: "",
      state: "",
      city: "",
      country: "Pakistan",
      pincode: "",
    },
    validationSchema: shippingSchema,
    onSubmit: (values) => {
      localStorage.setItem("address", JSON.stringify(values));
      checkOutHandler();
      console.log(values)
    },
  });

  const checkOutHandler = async () => {
    try {
      const result = await axios.post(
        "http://localhost:5000/api/user/order/checkout",
        { amount: totalAmount + 100 },
        config
      );
      alert('kkkk')

      if (result.data.success) {
        setClientSecret(result.data.clientSecret);
        setShowPaymentModal(true);
      }
    } catch (error) {
      console.error("Payment initiation failed:", error);
    }
  };

  const handlePaymentSuccess = async (paymentIntent) => {
    try {
      const result = await axios.post(
        "http://localhost:5000/api/user/order/paymentVerification",
        { paymentIntentId: paymentIntent.id },
        config
      );

      if (result.data.success) {
        dispatch(
          createAnOrder({
            totalPrice: totalAmount,
            totalPriceAfterDiscount: totalAmount,
            orderItems: cartState,
            paymentInfo: result.data.paymentIntent,
            shippingInfo: JSON.parse(localStorage.getItem("address")),
          })
        );
        dispatch(deleteUserCart(config2));
        localStorage.removeItem("address");
        dispatch(resetState());
        setShowPaymentModal(false);
        navigate("/my-orders");
      }
    } catch (error) {
      console.error("Order creation failed:", error);
    }
  };

  return (
    <>
      <Container class1="checkout-wrapper py-5 home-wrapper-2">
      <div className="row">
          <div className="col-7">
            <div className="checkout-left-data">
              <h3 className="website-name">Dazzle Den</h3>
              <nav
                style={{ "--bs-breadcrumb-divider": ">" }}
                aria-label="breadcrumb"
              >
                <ol className="breadcrumb">
                  <li className="breadcrumb-item">
                    <Link className="text-dark total-price" to="/cart">
                      Cart
                    </Link>
                  </li>
                  &nbsp; /&nbsp;
                  <li
                    className="breadcrumb-ite total-price active"
                    aria-current="page"
                  >
                    Information
                  </li>
                  &nbsp; /
                  <li className="breadcrumb-item total-price active">
                    Shipping
                  </li>
                  &nbsp; /
                  <li
                    className="breadcrumb-item total-price active"
                    aria-current="page"
                  >
                    Payment
                  </li>
                </ol>
              </nav>
              <h4 className="title total">Contact Information</h4>
              <p className="user-details total">
                Ayesha Shafqat (ayeshafqat36@gmail.com)
              </p>
              <h4 className="mb-3">Shipping Address</h4>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  console.log("Form submission triggered");
                  formik.handleSubmit(e);
                }}
                action=""
                className="d-flex gap-15 flex-wrap justify-content-between"
              >
                <div className="w-100">
                  <select
                    className="form-control form-select"
                    id="country"
                    name="country"
                    value={formik.values.country}
                    onChange={formik.handleChange("country")}
                    onBlur={formik.handleChange("country")}
                  >
                    <option value="" disabled>
                      Select Country
                    </option>
                    <option selected value="Pakistan">Pakistan</option>
                  </select>
                  <div className="error ms-2 my-1">
                    {formik.touched.country && formik.errors.country}
                  </div>
                </div>
                <div className="flex-grow-1">
                  <input
                    type="text"
                    placeholder="First Name"
                    className="form-control"
                    name="firstname"
                    value={formik.values.firstname}
                    onChange={formik.handleChange("firstname")}
                    onBlur={formik.handleBlur("firstname")}
                  />
                  <div className="error ms-2 my-1">
                    {formik.touched.firstname && formik.errors.firstname}
                  </div>
                </div>
                <div className="flex-grow-1">
                  <input
                    type="text"
                    placeholder="Last Name"
                    className="form-control"
                    name="lastname"
                    value={formik.values.lastname}
                    onChange={formik.handleChange("lastname")}
                    onBlur={formik.handleBlur("lastname")}
                  />
                  <div className="error ms-2 my-1">
                    {formik.touched.lastname && formik.errors.lastname}
                  </div>
                </div>
                <div className="w-100">
                  <input
                    type="text"
                    placeholder="Address"
                    className="form-control"
                    name="address"
                    value={formik.values.address}
                    onChange={formik.handleChange("address")}
                    onBlur={formik.handleBlur("address")}
                  />
                  <div className="error ms-2 my-1">
                    {formik.touched.address && formik.errors.address}
                  </div>
                </div>
                <div className="w-100">
                  <input
                    type="text"
                    placeholder="Apartment, Suite ,etc"
                    className="form-control"
                    name="other"
                    value={formik.values.other}
                    onChange={formik.handleChange("other")}
                    onBlur={formik.handleBlur("other")}
                  />
                </div>
                <div className="flex-grow-1">
                  <input
                    type="text"
                    placeholder="City"
                    className="form-control"
                    name="city"
                    value={formik.values.city}
                    onChange={formik.handleChange("city")}
                    onBlur={formik.handleBlur("city")}
                  />
                  <div className="error ms-2 my-1">
                    {formik.touched.city && formik.errors.city}
                  </div>
                </div>
              <div className="flex-grow-1">
                  <select
                    className="form-control form-select"
                    id=""
                    name="state"
                    value={formik.values.state}
                    onChange={formik.handleChange("state")}
                    onBlur={formik.handleChange("state")}
                  >
                    <option value="" selected disabled>
                      Select State
                    </option>
                    <option value="Lahore">Lahore</option>
                  </select>
                  <div className="error ms-2 my-1">
                    {formik.touched.state && formik.errors.state}
                  </div>
                </div>
                <div className="flex-grow-1">
                  <input
                    type="text"
                    placeholder="Pincode"
                    className="form-control"
                    name="pincode"
                    value={formik.values.pincode}
                    onChange={formik.handleChange("pincode")}
                    onBlur={formik.handleBlur("pincode")}
                  />
                  <div className="error ms-2 my-1">
                    {formik.touched.pincode && formik.errors.pincode}
                  </div>
                </div>
                <div className="w-100">
                  <div className="d-flex justify-content-between align-items-center">
                    <Link to="/cart" className="text-dark">
                      <BiArrowBack className="me-2" />
                      Return to Cart
                    </Link>
                    <Link to="/cart" className="button">
                      Continue to Shipping
                    </Link>
                    <button className="button" type="submit">
                      Place Order
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
          <div className="col-5">
            <div className="border-bottom py-4">
              {cartState &&
                cartState?.map((item, index) => {
                  return (
                    <div
                      key={index}
                      className="d-flex gap-10 mb-2 align-align-items-center"
                    >
                      <div className="w-75 d-flex gap-10">
                        <div className="w-25 position-relative">
                          <span
                            style={{ top: "-10px", right: "2px" }}
                            className="badge bg-secondary text-white rounded-circle p-2 position-absolute"
                          >
                            {item?.quantity}
                          </span>
                          <img
                            src={item?.productId?.images[0]?.url}
                            width={100}
                            height={100}
                            alt="product"
                          />
                        </div>
                        <div>
                          <h5 className="total-price">
                            {item?.productId?.title}
                          </h5>
                          <p className="total-price">{item?.color?.title}</p>
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <h5 className="total">
                           Rs. {item?.price * item?.quantity} 
                        </h5>
                      </div>
                    </div>
                  );
                })}
            </div>
            <div className="border-bottom py-4">
              <div className="d-flex justify-content-between align-items-center">
                <p className="total">Subtotal</p>
                <p className="total-price">
                  Rs. {totalAmount ? totalAmount : "0"}
                </p>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <p className="mb-0 total">Shipping</p>
                <p className="mb-0 total-price">Rs. 100</p>
              </div>
            </div>
            <div className="d-flex justify-content-between align-items-center border-bootom py-4">
              <h4 className="total">Total</h4>
              <h5 className="total-price">
                Rs. {totalAmount ? totalAmount + 100 : "0"}
              </h5>
            </div>
          </div>
        </div>
      </Container>

      <Modal
        title="Payment Details"
        open={showPaymentModal}
        onCancel={() => setShowPaymentModal(false)}
        footer={null}
      >
        {clientSecret && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm onSuccess={handlePaymentSuccess} amount={totalAmount + 100} />
          </Elements>
        )}
      </Modal>
    </>
  );
};

export default Checkout;

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();
  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }

  }, [cartPreviousValue, cart]);

  useEffect(() => {
    // Every time the CartProvider is called/rendered, it is going to enter into this useEffect    
    prevCartRef.current = cart;
  })

  const addProduct = async (productId: number) => {
    try {
      const existedCart = [...cart];
      const product = existedCart.find(x => x.id === productId);
      const productAmmount = product ? product.amount : 0;
      const amount = productAmmount + 1;
      const productStock = await api.get(`/stock/${productId}`);


      if (amount > productStock.data.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (product) {
        product.amount = amount;
      }
      else {
        const product = await api.get(`/products/${productId}`);
        const newProduct = {
          ...product.data, amount: 1
        }

        existedCart.push(newProduct);
      }

      setCart(existedCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartList = [...cart];
      const index = cartList.findIndex(product => product.id === productId);

      if (index < 0) {
        throw Error();
      }

      cartList.splice(index, 1);
      setCart(cartList);

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (amount <= 0) {
        return;
      }

      const productStock = await api.get(`/stock/${productId}`);

      if (amount > productStock.data.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      let cartList = [...cart];
      const product = cartList.find(product => product.id === productId);

      if (product) {
        product.amount = amount;
        setCart(cartList);
        return;
      }

      throw Error();

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

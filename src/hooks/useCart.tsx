import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

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

const keyLocalStorage = '@RocketShoes:cart';

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(keyLocalStorage);

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const responseStock = await api.get(`stock/${productId}`);

      const stock: Stock = responseStock.data;

      if (stock.amount < 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const responseProduct = await api.get(`products/${productId}`);

      const product: Product = {
        ...responseProduct.data,
        amount: 1,
      };

      const indexProductInCart = cart.findIndex((p) => p.id === product.id);

      if (indexProductInCart >= 0) {
        const newAmount = cart[indexProductInCart].amount + 1;

        if (stock.amount < newAmount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const newCart = [...cart];

        newCart[indexProductInCart] = {
          ...product,
          amount: newAmount,
        };

        setCart([...newCart]);

        localStorage.setItem(keyLocalStorage, JSON.stringify(newCart));

        toast.success('Produto adicionado ao carrinho');
        return;
      }

      setCart([...cart, product]);

      localStorage.setItem(keyLocalStorage, JSON.stringify([...cart, product]));

      toast.success('Produto adicionado ao carrinho');
    } catch (e) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const index = cart.findIndex((p) => p.id === productId);

      if (index < 0) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const newCart = cart.filter((product) => product.id !== productId);

      setCart(newCart);

      localStorage.setItem(keyLocalStorage, JSON.stringify(newCart));
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

      const responseStock = await api.get(`stock/${productId}`);

      const stock: Stock = responseStock.data;

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart;

      const indexProductInCart = cart.findIndex((p) => p.id === productId);

      newCart[indexProductInCart] = {
        ...newCart[indexProductInCart],
        amount,
      };

      setCart([...newCart]);

      localStorage.setItem(keyLocalStorage, JSON.stringify(newCart));
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

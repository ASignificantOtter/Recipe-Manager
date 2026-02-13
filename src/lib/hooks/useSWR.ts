import useSWR from "swr";
import { useRouter } from "next/navigation";

// Generic fetcher function
const fetcher = async (url: string) => {
  const response = await fetch(url);
  
  // Handle 401 redirects
  if (response.status === 401) {
    throw new Error("Unauthorized");
  }
  
  if (!response.ok) {
    throw new Error("Failed to fetch");
  }
  
  return response.json();
};

// Recipe hooks
export function useRecipes() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR("/api/recipes", fetcher, {
    revalidateOnFocus: false,
    onError: (err) => {
      if (err.message === "Unauthorized") {
        router.push("/auth/signin");
      }
    },
  });

  return {
    recipes: data,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useRecipe(id: string) {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/recipes/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      onError: (err) => {
        if (err.message === "Unauthorized") {
          router.push("/auth/signin");
        }
      },
    }
  );

  return {
    recipe: data,
    isLoading,
    isError: error,
    mutate,
  };
}

// Meal plan hooks
export function useMealPlans() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR("/api/meal-plans", fetcher, {
    revalidateOnFocus: false,
    onError: (err) => {
      if (err.message === "Unauthorized") {
        router.push("/auth/signin");
      }
    },
  });

  return {
    mealPlans: data,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useMealPlan(id: string) {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/api/meal-plans/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      onError: (err) => {
        if (err.message === "Unauthorized") {
          router.push("/auth/signin");
        }
      },
    }
  );

  return {
    mealPlan: data,
    isLoading,
    isError: error,
    mutate,
  };
}

import { supabase } from "./supabase";

export const signup = async (
  name: string,
  email: string,
  password: string
) => {
  console.log("SIGNUP NAME:", name);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: name,
      },
    },
  });

  console.log("SIGNUP RESPONSE:", data);

  if (error) throw error;
};


export const login = async (
  email: string,
  password: string
) => {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
};

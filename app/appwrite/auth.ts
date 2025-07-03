import { ID, OAuthProvider, Query } from "appwrite";
import { appwriteConfig } from "~/appwrite/client";
import { redirect } from "react-router";

// Lazy load Appwrite services on the client side
const getServices = () => {
  if (typeof window === "undefined") return null;

  const { account, database } = require("~/appwrite/client");
  return { account, database };
};

// GET current user
export const getUser = async () => {
  const services = getServices();
  if (!services?.account || !services?.database) return redirect("/sign-in");

  try {
    const user = await services.account.get();
    if (!user) return redirect("/sign-in");

    const { documents } = await services.database.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [
        Query.equal("accountId", user.$id),
        Query.select(["name", "email", "imageUrl", "joinedAt", "accountId"]),
      ]
    );

    return documents.length > 0 ? documents[0] : redirect("/sign-in");
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};

// LOGIN via Google OAuth
export const loginWithGoogle = async () => {
  if (typeof window === "undefined") return;

  const { account } = require("~/appwrite/client");
  try {
    account.createOAuth2Session(
      OAuthProvider.Google,
      `${window.location.origin}/`,
      `${window.location.origin}/404`
    );
  } catch (error) {
    console.error("Error during OAuth2 session creation:", error);
  }
};

// LOGOUT
export const logoutUser = async () => {
  const services = getServices();
  if (!services?.account) return;

  try {
    await services.account.deleteSession("current");
  } catch (error) {
    console.error("Error during logout:", error);
  }
};

// STORE user in DB
export const storeUserData = async () => {
  const services = getServices();
  if (!services?.account || !services?.database) return;

  try {
    const user = await services.account.get();
    if (!user) throw new Error("User not found");

    const session = await services.account.getSession("current");
    const profilePicture = session?.providerAccessToken
      ? await getGooglePicture(session.providerAccessToken)
      : null;

    const createdUser = await services.database.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      {
        accountId: user.$id,
        email: user.email,
        name: user.name,
        imageUrl: profilePicture,
        joinedAt: new Date().toISOString(),
      }
    );

    if (!createdUser?.$id) redirect("/sign-in");
  } catch (error) {
    console.error("Error storing user data:", error);
  }
};

// Fetch Google profile image
const getGooglePicture = async (accessToken: string) => {
  try {
    const response = await fetch(
      "https://people.googleapis.com/v1/people/me?personFields=photos",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) throw new Error("Failed to fetch Google profile picture");

    const { photos } = await response.json();
    return photos?.[0]?.url || null;
  } catch (error) {
    console.error("Error fetching Google picture:", error);
    return null;
  }
};

// Get existing user by accountId
export const getExistingUser = async (id: string) => {
  const services = getServices();
  if (!services?.database) return null;

  try {
    const { documents, total } = await services.database.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", id)]
    );
    return total > 0 ? documents[0] : null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};

// Paginate all users
export const getAllUsers = async (limit: number, offset: number) => {
  const services = getServices();
  if (!services?.database) return { users: [], total: 0 };

  try {
    const { documents: users, total } = await services.database.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.limit(limit), Query.offset(offset)]
    );

    return { users, total };
  } catch (e) {
    console.log("Error fetching users");
    return { users: [], total: 0 };
  }
};

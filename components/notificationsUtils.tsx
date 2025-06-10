// notificationsUtils.ts
import { collection, doc, getDocs, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../constants/firebaseConfig"; // adapte le chemin selon ton dossier

export async function addNotificationForUser(uid: string, message: string) {
  const notifRef = doc(collection(db, 'users', uid, 'notifications'));
  await setDoc(notifRef, {
    message,
    createdAt: serverTimestamp(),
    read: false,
  });
}
export async function notifyLivreursLivraisonDisponible(commandes: any) {
  const usersSnap = await getDocs(collection(db, 'users'));
  usersSnap.forEach((userDoc) => {
    const data = userDoc.data();
    if (data.role === 'livreur') {
      addNotificationForUser(
        userDoc.id,
        `Une livraison est disponible pour la commande à ${commandes.adresse}.`
      );
    }
  });
}
export async function notifyOnLivraisonAccepted(commandes: any, livreurAccepte: string) {
  await addNotificationForUser(
    commandes.uid,
    `Votre commande est en cours de livraison.`
  );
  await addNotificationForUser(
    livreurAccepte,
    `Vous avez accepté la livraison pour la commande à ${commandes.adresse}.`
  );
}
export async function notifyOnCommandeLivree(commandes: any, livreurAccepte: string) {
  await addNotificationForUser(
    commandes.uid,
    `Votre commande a été livrée avec succès.`
  );
  await addNotificationForUser(
    commandes.idVendeur,
    `La commande a été livrée au client à ${commandes.adresse}.`
  );
  await addNotificationForUser(
    livreurAccepte,
    `Vous avez livré la commande avec succès.`
  );
}

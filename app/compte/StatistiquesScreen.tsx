import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../constants/firebaseConfig';

interface User {
  id: string;
  role: 'acheteur' | 'vendeur' | 'livreur';
  nom?: string;
  email?: string;
}

interface Product {
  nom: string;
  quantiteAchat: number;
  prixPromotionnel?: number;
  prixNormal: number;
  ownerId: string;
  boutique: string;
}

interface Boutique {
  id: string;
  nom: string;
}

interface Commande {
  id: string;
  uid: string;
  idVendeur: string;
  livreurAccepte: string;
  totalAPayer: number;
  prixTotalVendeur: number;
  prixLivraison: number;
  date: string;
  adresse: string;
  statut: string;
  panier: Product[];
  detailsBoutiques: Boutique[];
}

interface Stats {
  global: {
    label: string;
    value: string | number;
  }[];
  historique: {
    date: string;
    commande: string;
    quantite: string | number;
    prixUnite: string;
    total: string;
  }[];
  produitsRestants?: {
    date: string;
    produit: string;
    prix: string | number;
    quantite: string | number;
    statut: string;
    totalPrevu: string | number;
    totalGagne: string | number;
    perte: string | number;
  }[];
}

interface LivreurStats {
  global: {
    label: string;
    value: string | number;
  }[];
  historique: {
    date: string;
    distance: string;
    revenu: string;
    adresse: string;
    prixLivraison: string;
    boutique: string;
  }[];
  bilanBoutique?: {
    boutique: string;
    total: string;
  }[];
}

interface Props {
  role: 'acheteur' | 'vendeur' | 'livreur';
  onBack: () => void;
  onProfil: () => void;
}

interface StatsTableProps {
  global: {
    label: string;
    value: string | number;
  }[];
}

interface HistoriqueTableProps {
  historique: {
    date: string;
    commande: string;
    quantite: string | number;
    prixUnite: string;
    total: string;
  }[];
}

interface ProduitsRestantsTableProps {
  produitsRestants: {
    date: string;
    produit: string;
    prix: string | number;
    quantite: string | number;
    statut: string;
    totalPrevu: string | number;
    totalGagne: string | number;
    perte: string | number;
  }[];
}

interface BilanBoutiqueTableProps {
  bilanBoutique: {
    boutique: string;
    total: string;
  }[];
}

interface LivreurHistoriqueTableProps {
  historique: {
    date: string;
    distance: string;
    revenu: string;
    adresse: string;
    prixLivraison: string;
    boutique: string;
  }[];
}

export default function StatistiquesScreen({ role, onBack, onProfil }: Props) {
  const [acheteurStats, setAcheteurStats] = useState<Stats | null>(null);
  const [vendeurStats, setVendeurStats] = useState<Stats | null>(null);
  const [livreurStats, setLivreurStats] = useState<LivreurStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const commandesSnap = await getDocs(collection(db, 'commandes'));
        const productsSnap = await getDocs(collection(db, 'products'));
        const boutiquesSnap = await getDocs(collection(db, 'boutiques'));

        const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
        const commandes = commandesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Commande[];
        const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Record<string, any>;
        const boutiques = boutiquesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Record<string, any>;

        // ==============================
        //       Statistiques Acheteur
        // ==============================
        const acheteur = users.find(u => u.role === 'acheteur');
        let acheteurCmds: Commande[] = [];
        if (acheteur) {
          acheteurCmds = commandes.filter(c => c.uid === acheteur.id);

          // Nombre de commandes
          const nombreCommandes = acheteurCmds.length;
          // Montant total dépensé
          const montantTotal = acheteurCmds.reduce((sum, c) => sum + (c.totalAPayer || 0), 0);
          // Dernière commande passée
          const lastCmd = acheteurCmds.reduce((a, b) => ((a?.date || '') > (b?.date || '') ? a : b), acheteurCmds[0]);
          // Produit le plus acheté
          const produits: Record<string, number> = {};
          acheteurCmds.forEach(cmd => (cmd.panier || []).forEach(prod => {
            produits[prod.nom] = (produits[prod.nom] || 0) + (prod.quantiteAchat || 1);
          }));
          const produitFavori = Object.keys(produits).length ? Object.entries(produits).sort((a, b) => b[1] - a[1])[0][0] : '-';
          // Nombre moyen d'articles/commande
          const moyArticles = nombreCommandes ? (
            acheteurCmds.reduce((s, c) => s + ((c.panier && c.panier.length) || 0), 0) / nombreCommandes
          ).toFixed(1) : '0';

          // Boutiques préférées (top 3)
          const boutiquesPref: Record<string, number> = {};
          acheteurCmds.forEach(cmd => (cmd.panier || []).forEach(prod => {
            if (prod.boutique) {
              boutiquesPref[prod.boutique] = (boutiquesPref[prod.boutique] || 0) + 1;
            }
          }));
          const topBoutiques = Object.entries(boutiquesPref)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name]) => name);

          setAcheteurStats({
            global: [
              { label: 'Nombre total de commandes', value: nombreCommandes },
              { label: 'Montant total dépensé', value: `${montantTotal} TND` },
              { label: 'Produit le plus acheté', value: produitFavori },
              { label: '1ère Boutique préférée', value: topBoutiques[0] || '-' },
              { label: '2ème Boutique préférée', value: topBoutiques[1] || '-' },
              { label: '3ème Boutique préférée', value: topBoutiques[2] || '-' },
              { label: 'Nombre moyen d\'articles/commande', value: moyArticles },
              { label: 'Dernière commande passée', value: lastCmd?.date ? lastCmd.date.slice(0, 10) : '-' }
            ],
            historique: acheteurCmds.slice(0, 4).map((cmd, idx) => {
              const prod = (cmd.panier && cmd.panier[0]) || {};
              return {
                date: cmd.date ? cmd.date.slice(0, 10) : '-',
                commande: `Commande #${idx + 1}`,
                quantite: prod.quantiteAchat || '-',
                prixUnite: `${prod.prixPromotionnel || prod.prixNormal || '-'} TND`,
                total: cmd.totalAPayer ? `${cmd.totalAPayer} TND` : '-'
              };
            })
          });
        }

        // ==============================
        //       Statistiques Vendeur
        // ==============================
        const vendeur = users.find(u => u.role === 'vendeur');
        let vendeurCmds: Commande[] = [];
        if (vendeur) {
          vendeurCmds = commandes.filter(c =>
            c.idVendeur === vendeur.id ||
            (c.detailsBoutiques && c.detailsBoutiques.find(b => b.id === vendeur.id))
          );

          const nombreCmds = vendeurCmds.length;
          const totalVentes = vendeurCmds.reduce((sum, c) => sum + (c.prixTotalVendeur || 0), 0);

          // Produits vendus
          const produitsVendus: Record<string, number> = {};
          vendeurCmds.forEach(cmd => (cmd.panier || []).forEach(prod => {
            if (prod.ownerId === vendeur.id) {
              produitsVendus[prod.nom] = (produitsVendus[prod.nom] || 0) + (prod.quantiteAchat || 1);
            }
          }));
          const produitsArray = Object.entries(produitsVendus).sort((a, b) => b[1] - a[1]);
          const top3Produits = produitsArray.slice(0, 3).map(x => x[0]);
          const moinsVendu = produitsArray.length ? produitsArray[produitsArray.length - 1][0] : '-';

          // Clients fidèles
          const clients: Record<string, number> = {};
          vendeurCmds.forEach(cmd => { clients[cmd.uid] = (clients[cmd.uid] || 0) + 1; });
          const topClients = Object.entries(clients).sort((a, b) => b[1] - a[1]).slice(0, 3);

          // Ville avec plus de commandes
          const villes: Record<string, number> = {};
          vendeurCmds.forEach(cmd => {
            if (cmd.adresse) villes[cmd.adresse] = (villes[cmd.adresse] || 0) + 1;
          });
          const topVille = Object.keys(villes).length ? Object.entries(villes).sort((a, b) => b[1] - a[1])[0][0] : '-';

          setVendeurStats({
            global: [
              { label: 'Nombre total de commandes reçues', value: nombreCmds },
              { label: 'Montant total des ventes', value: `${totalVentes} TND` },
              { label: '1er Produit le plus vendu', value: top3Produits[0] || '-' },
              { label: '2ème Produit le plus vendu', value: top3Produits[1] || '-' },
              { label: '3ème Produit le plus vendu', value: top3Produits[2] || '-' },
              { label: 'Produit le moins vendu', value: moinsVendu },
              { label: '1er Client le plus fidèle', value: topClients[0] ? topClients[0][0] : '-' },
              { label: '2ème Client le plus fidèle', value: topClients[1] ? topClients[1][0] : '-' },
              { label: '3ème Client le plus fidèle', value: topClients[2] ? topClients[2][0] : '-' },
              { label: 'Ville avec plus de commandes', value: topVille }
            ],
            produitsRestants: vendeurCmds.slice(0, 1).map(cmd => {
              const prod = (cmd.panier && cmd.panier[0]) || {};
              return {
                date: cmd.date ? cmd.date.slice(0, 10) : '-',
                produit: prod.nom || '-',
                prix: prod.prixPromotionnel || prod.prixNormal || '-',
                quantite: prod.quantiteAchat || '-',
                statut: prod.quantiteAchat ? `${prod.quantiteAchat - 1} achetés / 1 non acheté` : '-',
                totalPrevu: prod.prixNormal ? prod.prixNormal * prod.quantiteAchat : '-',
                totalGagne: prod.prixPromotionnel ? prod.prixPromotionnel * prod.quantiteAchat : '-',
                perte: (prod.prixNormal && prod.prixPromotionnel && prod.quantiteAchat)
                  ? (prod.prixNormal - prod.prixPromotionnel) * prod.quantiteAchat : '-'
              };
            }),
            historique: vendeurCmds.slice(0, 4).map((cmd, idx) => {
              const prod = (cmd.panier && cmd.panier[0]) || {};
              return {
                date: cmd.date ? cmd.date.slice(0, 10) : '-',
                commande: `Commande #${idx + 1}`,
                quantite: prod.quantiteAchat || '-',
                prixUnite: `${prod.prixPromotionnel || prod.prixNormal || '-'} TND`,
                total: cmd.prixTotalVendeur ? `${cmd.prixTotalVendeur} TND` : '-'
              };
            })
          });
        }

        // ==============================
        //       Statistiques Livreur
        // ==============================
        const livreur = users.find(u => u.role === 'livreur');
        let livreurCmds: Commande[] = [];
        if (livreur) {
          livreurCmds = commandes.filter(c => c.livreurAccepte === livreur.id);

          const nombreLivraisons = livreurCmds.length;
          const totalGagne = livreurCmds.reduce((sum, c) => sum + (c.prixLivraison || 0), 0);

          // Boutiques livrées
          const boutiquesLivrees: Record<string, number> = {};
          livreurCmds.forEach(cmd => {
            if (cmd.detailsBoutiques) {
              cmd.detailsBoutiques.forEach(b => {
                boutiquesLivrees[b.nom] = (boutiquesLivrees[b.nom] || 0) + 1;
              });
            }
          });
          const topBoutiques = Object.entries(boutiquesLivrees)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name]) => name);

          setLivreurStats({
            global: [
              { label: 'Nombre total de livraisons', value: nombreLivraisons },
              { label: 'Montant total gagné', value: `${totalGagne} TND` },
              { label: '1ère Boutique livrée', value: topBoutiques[0] || '-' },
              { label: '2ème Boutique livrée', value: topBoutiques[1] || '-' },
              { label: '3ème Boutique livrée', value: topBoutiques[2] || '-' }
            ],
            historique: livreurCmds.slice(0, 4).map((cmd, idx) => ({
              date: cmd.date ? cmd.date.slice(0, 10) : '-',
              distance: '-',
              revenu: cmd.prixLivraison ? `${cmd.prixLivraison} TND` : '-',
              adresse: cmd.adresse || '-',
              prixLivraison: cmd.prixLivraison ? `${cmd.prixLivraison} TND` : '-',
              boutique: cmd.detailsBoutiques?.[0]?.nom || '-'
            })),
            bilanBoutique: Object.entries(boutiquesLivrees).map(([boutique, count]) => ({
              boutique,
              total: `${count} livraison(s)`
            }))
          } as LivreurStats);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onProfil} style={styles.profilButton}>
          <Text style={styles.profilButtonText}>👤 Profil</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          {role === 'acheteur' && acheteurStats && (
            <>
              <Text style={styles.title}>Statistiques Acheteur</Text>
              <StatsTable global={acheteurStats.global} />
              <Text style={styles.subTitle}>Historique des commandes :</Text>
              <HistoriqueAcheteurTable historique={acheteurStats.historique} />
            </>
          )}

          {role === 'vendeur' && vendeurStats && (
            <>
              <Text style={styles.title}>Statistiques Vendeur</Text>
              <StatsTable global={vendeurStats.global} />
              <Text style={styles.subTitle}>Produits restants :</Text>
              <ProduitsRestantsTable produitsRestants={vendeurStats.produitsRestants || []} />
              <Text style={styles.subTitle}>Historique des ventes :</Text>
              <HistoriqueAcheteurTable historique={vendeurStats.historique} />
            </>
          )}

          {role === 'livreur' && livreurStats && (
            <>
              <Text style={styles.title}>Statistiques Livreur</Text>
              <StatsTable global={livreurStats.global} />
              <Text style={styles.subTitle}>Historique des livraisons :</Text>
              <HistoriqueLivreurTable historique={livreurStats.historique} />
              <Text style={styles.subTitle}>Bilan par boutique :</Text>
              <BilanBoutiqueTable bilanBoutique={livreurStats.bilanBoutique ?? []} />
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ----------- Petits composants pour tableaux -----------

function StatsTable({ global }: StatsTableProps) {
  if (!global) return null;
  return (
    <View style={styles.table}>
      {global.map((g, i) => (
        <View style={styles.row} key={i}>
          <Text style={styles.cellLabel}>{g.label}</Text>
          <Text style={styles.cellValue}>{g.value}</Text>
        </View>
      ))}
    </View>
  );
}

function HistoriqueAcheteurTable({ historique }: HistoriqueTableProps) {
  if (!historique) return null;
  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.headerRow]}>
        <Text style={styles.cellHeader}>🗓️ Date</Text>
        <Text style={styles.cellHeader}>Commande</Text>
        <Text style={styles.cellHeader}>Qté</Text>
        <Text style={styles.cellHeader}>Prix unité</Text>
        <Text style={styles.cellHeader}>💰 Total</Text>
      </View>
      {historique.map((h, i) => (
        <View style={styles.row} key={i}>
          <Text style={styles.cell}>{h.date}</Text>
          <Text style={styles.cell}>{h.commande}</Text>
          <Text style={styles.cell}>{h.quantite}</Text>
          <Text style={styles.cell}>{h.prixUnite}</Text>
          <Text style={styles.cell}>{h.total}</Text>
        </View>
      ))}
    </View>
  );
}

function ProduitsRestantsTable({ produitsRestants }: ProduitsRestantsTableProps) {
  if (!produitsRestants) return null;
  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.headerRow]}>
        <Text style={styles.cellHeader}>Date</Text>
        <Text style={styles.cellHeader}>Produit</Text>
        <Text style={styles.cellHeader}>Prix</Text>
        <Text style={styles.cellHeader}>Quantité</Text>
        <Text style={styles.cellHeader}>Statut</Text>
        <Text style={styles.cellHeader}>Prévu</Text>
        <Text style={styles.cellHeader}>Gagné</Text>
        <Text style={styles.cellHeader}>Perte</Text>
      </View>
      {produitsRestants.map((p, i) => (
        <View style={styles.row} key={i}>
          <Text style={styles.cell}>{p.date}</Text>
          <Text style={styles.cell}>{p.produit}</Text>
          <Text style={styles.cell}>{p.prix}</Text>
          <Text style={styles.cell}>{p.quantite}</Text>
          <Text style={styles.cell}>{p.statut}</Text>
          <Text style={styles.cell}>{p.totalPrevu}</Text>
          <Text style={styles.cell}>{p.totalGagne}</Text>
          <Text style={styles.cell}>{p.perte}</Text>
        </View>
      ))}
    </View>
  );
}

function HistoriqueLivreurTable({ historique }: LivreurHistoriqueTableProps) {
  if (!historique) return null;
  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.headerRow]}>
        <Text style={styles.cellHeader}>🗓️ Date</Text>
        <Text style={styles.cellHeader}>Distance</Text>
        <Text style={styles.cellHeader}>Revenu</Text>
        <Text style={styles.cellHeader}>Adresse</Text>
        <Text style={styles.cellHeader}>Prix livraison</Text>
        <Text style={styles.cellHeader}>Boutique</Text>
      </View>
      {historique.map((h, i) => (
        <View style={styles.row} key={i}>
          <Text style={styles.cell}>{h.date}</Text>
          <Text style={styles.cell}>{h.distance}</Text>
          <Text style={styles.cell}>{h.revenu}</Text>
          <Text style={styles.cell}>{h.adresse}</Text>
          <Text style={styles.cell}>{h.prixLivraison}</Text>
          <Text style={styles.cell}>{h.boutique}</Text>
        </View>
      ))}
    </View>
  );
}

function BilanBoutiqueTable({ bilanBoutique }: BilanBoutiqueTableProps) {
  if (!bilanBoutique) return null;
  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.headerRow]}>
        <Text style={styles.cellHeader}>Boutique</Text>
        <Text style={styles.cellHeader}>Total revenu livraison</Text>
      </View>
      {bilanBoutique.map((b, i) => (
        <View style={styles.row} key={i}>
          <Text style={styles.cell}>{b.boutique}</Text>
          <Text style={styles.cell}>{b.total}</Text>
        </View>
      ))}
    </View>
  );
}

// ----------- Styles -----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backButton: { padding: 8 },
  backButtonText: { fontSize: 16, fontWeight: 'bold', color: '#00897B' },
  profilButton: { padding: 8 },
  profilButtonText: { fontSize: 16, fontWeight: 'bold', color: '#00897B' },
  title: { fontWeight: 'bold', fontSize: 19, marginTop: 16, marginBottom: 6, color: '#00897B' },
  subTitle: { fontWeight: 'bold', fontSize: 15, marginTop: 12, marginBottom: 2 },
  table: { backgroundColor: '#fff', borderRadius: 8, marginBottom: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f1f1f1', paddingVertical: 5, paddingHorizontal: 5 },
  headerRow: { backgroundColor: '#E0F2F1' },
  cellHeader: { flex: 1, fontWeight: 'bold', color: '#2a2a2a', fontSize: 13 },
  cellLabel: { flex: 2, color: '#444', fontSize: 14 },
  cellValue: { flex: 1, color: '#00897B', fontWeight: 'bold', fontSize: 14, textAlign: 'right' },
  cell: { flex: 1, color: '#444', fontSize: 13 },
});


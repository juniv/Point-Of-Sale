/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useMemo } from "react";
import { Flex, useDisclosure } from "@chakra-ui/react";
import Coupon from "../Coupon";
import { Metaplex } from "@metaplex-foundation/js";
import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import { useWorkspace } from "../../contexts/workspace";
import BN from "bn.js";
import QrModal from "../Modal";
import { QuestionIcon } from "@chakra-ui/icons";
import Settings from "../Settings";

const connection = new Connection(clusterApiUrl("devnet"));
const metaplex = new Metaplex(connection);

const PointOfSale = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isSettingsOpen, onOpen: onSettingsOpen, onClose: onSettingsClose } = useDisclosure();
  const [NFTs, setNFTs] = useState<any[]>([]);
  const [mint, setMint] = useState("");
  const [merchantAddr, setMerchantAddr] = useState("2wZQ9Cco4qm5Sydekzdbz2uB3naJsehFKDW9qJVmnYLi");
  const workspace = useWorkspace();
  const merchantKey = useMemo(() => new PublicKey(merchantAddr), [merchantAddr]);

  useEffect(() => {
    const fetchData = async () => {
      // filter for the merchant's key
      const merchants = await workspace.program?.account.merchant.all([
        {
          memcmp: {
            offset: 8,
            bytes: merchantKey.toBase58(),
          },
        },
      ]);

      const programId = workspace.program?.programId;
      const program = workspace.program;

      if (!merchants || merchants.length == 0 || !programId || !program) return;

      // Grab the merchant data
      const merchant = merchants[0].publicKey;
      const promoCount = merchants[0].account.promoCount.toNumber();

      const promoAccounts = [];

      // Loop over all of the promos:
      for (let i = 0; i < promoCount; i++) {
        // Find the PDA associated with that promoCount:
        const key = new BN(i);
        const bytes = key.toArrayLike(Buffer, "be", 8);
        const [promoAddress, promoBump] = await PublicKey.findProgramAddress([merchant.toBuffer(), bytes], programId);

        // fetch the account data at that address
        const promoAccount = await program.account.promo.fetch(promoAddress);

        // add the promo to our list of promoAccounts
        promoAccounts.push(promoAccount);
      }

      const promoMints = promoAccounts.map((promoAccount) => promoAccount?.mint);

      // Fetch all of the NFT accounts

      const nftAccounts = await Promise.all(
        promoMints.map(async (promoMint: PublicKey) => await metaplex.nfts().findByMint(promoMint))
      );

      // Retrieve the data stored in the NFT uri
      const responses = await Promise.all(nftAccounts.map(async (nft) => await fetch(`${nft.uri}`)));

      // parse the data
      const jsons = await Promise.all(responses.map(async (response) => await response.json()));

      // join data into an object and then store it in the state
      const nftData = nftAccounts.map((nft, ind) => ({ nft: nft, json: jsons[ind] }));
      setNFTs(nftData);
    };

    console.log("Refetching");
    fetchData();
  }, [merchantKey.toString()]);

  return (
    <Flex width="100%" height="100vh">
      <Flex position="absolute" right={25} top={25}>
        <QuestionIcon onClick={onSettingsOpen} cursor="pointer" />
      </Flex>

      <Settings
        isOpen={isSettingsOpen}
        onClose={onSettingsClose}
        merchantAddr={merchantAddr}
        setMerchantAddr={setMerchantAddr}
      />
      <QrModal onClose={onClose} isOpen={isOpen} mint={mint} />

      <Flex flexWrap="wrap" width="94%">
        {NFTs.map((nft, ind) => (
          <Coupon key={ind} {...nft} setMint={setMint} onOpen={onOpen} />
        ))}
      </Flex>
    </Flex>
  );
};

export default PointOfSale;

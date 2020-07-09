import smartpy as sp

class VickreyAuctionFactory(sp.Contract):
    def __init__(self, master_auction_contract, owner):
        self.vickrey = VickreyAuction()
        self.init(master_auction_contract = master_auction_contract, owner = owner)

    @sp.entry_point
    def setMasterAuctionContractAddress(self, master_auction_contract):
        sp.verify(sp.sender == self.data.owner)
        self.data.master_auction_contract = master_auction_contract

    @sp.entry_point
    def createVickreyAuctionInstance(self, asset_id, asset_name):
        sp.verify(sp.sender == self.data.master_auction_contract)
        
        contract_address = sp.some(sp.create_contract(
            storage = sp.record(owner = sp.source,
                master_auction_contract = sp.to_address(sp.self),
                asset_id = asset_id,
                # deposit will get seized if participant tries to cheat
                deposit = 0,
                sealed_bids = sp.map(tkey = sp.TAddress, tvalue = sp.TBytes),
                # TODO: maintain revealed_participants list and only refund those
                # possibly split the money b/w highest bidder and owner
                # enforcing all participants to reveal their bids
                # Then there'll be no need to maintain revealed_count & first_revealed
                revealed_count = 0,
                highest_bid = sp.mutez(0),
                second_highest_bid = sp.mutez(0),
                highest_bidder = sp.sender,
                second_highest_bidder = sp.sender,
                started = sp.bool(False),
                first_revealed = sp.bool(False),
                ended = sp.bool(False),
                start_time = sp.now,
                round_time = 0), 
            contract = self.vickrey))
        
        # registerInstance
        c = sp.contract(sp.TRecord(asset_id = sp.TNat, contract_address = sp.TAddress),  self.data.master_auction_contract, entry_point = "registerInstance").open_some()
        sp.transfer(sp.record(asset_id = asset_id, contract_address = contract_address.open_some()), sp.mutez(0), c)
        


class VickreyAuction(sp.Contract):
    def __init__(self):
        self.init_type(t = sp.TRecord(owner = sp.TAddress,
                master_auction_contract = sp.TAddress,
                asset_id = sp.TNat,
                deposit = sp.TNat,
                sealed_bids = sp.TMap(sp.TAddress, sp.TBytes),
                revealed_count = sp.TNat,
                highest_bid = sp.TMutez,
                second_highest_bid = sp.TMutez,
                highest_bidder = sp.TAddress,
                second_highest_bidder = sp.TAddress,
                started = sp.TBool,
                first_revealed = sp.TBool,
                ended = sp.TBool,
                start_time = sp.TTimestamp,
                round_time = sp.TInt))
                # round_time (two round time cycles for submission of sealed bids and for revealing bids)

    @sp.entry_point
    def configureAuction(self, params): 
        sp.verify(sp.sender == self.data.owner)
        sp.verify(~self.data.started)
        sp.verify(~self.data.first_revealed)
        sp.verify(~self.data.ended)
        
        self.data.deposit = params.deposit
        self.data.start_time = params.start_time
        self.data.round_time = params.round_time
        
        # configureInstance 
        c = sp.contract(sp.TNat, self.data.master_auction_contract, entry_point = "configureInstance").open_some()
        sp.transfer(self.data.asset_id, sp.mutez(0), c)

    @sp.entry_point
    def startAuction(self, params): 
        sp.verify(sp.sender == self.data.owner)
        sp.verify(~self.data.started)
        sp.verify(~self.data.first_revealed)
        sp.verify(~self.data.ended)
        # verify now is less than round_end_time = start_time + round_time
        sp.verify(sp.now < self.data.start_time.add_seconds(self.data.round_time))

        self.data.started = sp.bool(True)
        self.data.start_time = sp.now

        # startedAuction 
        c = sp.contract(sp.TNat, self.data.master_auction_contract, entry_point = "startedAuction").open_some()
        sp.transfer(self.data.asset_id, sp.mutez(0), c)

    @sp.entry_point
    def submitSealedBid(self, params):
        sp.verify(self.data.started)
        sp.verify(~self.data.first_revealed)
        sp.verify(~self.data.ended)
        # verify an externally owned account and not a contract account 
        sp.verify(sp.sender == sp.source)
        # verify now is less than round_end_time = start_time + round_time
        sp.verify(sp.now < self.data.start_time.add_seconds(self.data.round_time))
        sp.verify(sp.amount == sp.mutez(self.data.deposit))

        self.data.sealed_bids[sp.sender] = params.sealed_bid

    @sp.entry_point
    def revealBid(self, params):
        sp.verify(self.data.started)
        sp.verify(~self.data.ended)
        # verify now is more than round end time = start_time + round_time but 
        # less than start time + twice of round time
        sp.verify(sp.now > self.data.start_time.add_seconds(self.data.round_time))
        sp.verify(sp.now < self.data.start_time.add_seconds(2 * self.data.round_time))
        # bidder sends amt committed previusly minus amt locked as participation fee
        # if this doesn't match, possibly penalise the participant by seizing his deposit
        sp.verify(sp.mutez(params.value + self.data.deposit) == sp.amount)
        sp.verify(sp.sha256(sp.pack(params.value + self.data.deposit)) == self.data.sealed_bids[sp.sender])
        sp.if ~self.data.first_revealed:
            self.data.first_revealed = sp.bool(True)
        
        self.data.revealed_count += 1
        sp.if (sp.amount > self.data.highest_bid):
            self.second_highest_bid = self.data.highest_bid
            self.data.highest_bid = sp.amount
            self.data.second_highest_bidder = self.data.highest_bidder
            self.data.highest_bidder = sp.sender

    @sp.entry_point
    def resolveAuction(self, params):
        sp.verify(self.data.started)
        sp.verify(self.data.first_revealed)
        sp.verify(~self.data.ended)
        sp.verify(self.data.sealed_bids.contains(sp.sender))
        sp.verify((self.data.revealed_count == sp.len(self.data.sealed_bids)) | (sp.now > self.data.start_time.add_seconds(2 * self.data.round_time)))
        
        sp.for bidder in self.data.sealed_bids.keys():
            sp.if (~(bidder == self.data.second_highest_bidder)):
                # refund participation fee to bidder
                sp.send(bidder, sp.mutez(self.data.deposit))

        # endAuction
        self.endAuction(self.data.asset_id, self.data.owner)

    @sp.entry_point
    def cancelAuction(self, params):
        sp.verify(self.data.started)
        sp.verify(~self.data.first_revealed)
        sp.verify(~self.data.ended)
        sp.verify(sp.sender == self.data.owner)

        sp.for bidder in self.data.sealed_bids.keys():
            # refund participation fee to bidder
            sp.send(bidder, sp.mutez(self.data.deposit))

        # endAuction
        self.endAuction(self.data.asset_id, self.data.owner)

    def endAuction(self, asset_id, owner):
        self.data.ended = sp.bool(True)

        # destroyInstance 
        c = sp.contract(sp.TRecord(asset_id = sp.TNat, owner = sp.TAddress), self.data.master_auction_contract, entry_point = "destroyInstance").open_some()
        sp.transfer(sp.record(asset_id = asset_id, owner = owner), sp.mutez(0), c)




@sp.add_test(name = "Test Auction")
def test():
    scenario = sp.test_scenario()

    # Create HTML output for debugging
    scenario.h1("Vickrey Auction Factory")
    
    # Initialize test accounts
    master = sp.address("tz1-master-address-1234")
    owner = sp.address("tz1-owner-address-1234")

    # Instantiate Auction contract
    vickreyAuctionFactory = VickreyAuctionFactory(master_auction_contract = master, owner = owner)
    scenario += vickreyAuctionFactory

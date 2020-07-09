import smartpy as sp

class EnglishAuctionFactory(sp.Contract):
    def __init__(self, master_auction_contract, owner):
        self.english = EnglishAuction()
        self.init(master_auction_contract = master_auction_contract, owner = owner)

    @sp.entry_point
    def setMasterAuctionContractAddress(self, master_auction_contract):
        sp.verify(sp.sender == self.data.owner)
        self.data.master_auction_contract = master_auction_contract

    @sp.entry_point
    def createEnglishAuctionInstance(self, asset_id):
        sp.verify((sp.sender == self.data.master_auction_contract), "only master auction contract can create instance")
        
        contract_address = sp.some(sp.create_contract(
            storage = sp.record(owner = sp.source,
                master_auction_contract = self.data.master_auction_contract,
                asset_id = asset_id,
                current_bid = sp.mutez(0),
                min_increase = 0,
                highest_bidder = self.data.master_auction_contract,
                started = sp.bool(False),
                first_bid_placed = sp.bool(False),
                ended = sp.bool(False),
                start_time = sp.now,
                round_time = 0), 
            contract = self.english))
        
        # registerInstance
        c = sp.contract(sp.TRecord(asset_id = sp.TNat, contract_address = sp.TAddress),  self.data.master_auction_contract, entry_point = "registerInstance").open_some()
        sp.transfer(sp.record(asset_id = asset_id, contract_address = contract_address.open_some()), sp.mutez(0), c)
        


class EnglishAuction(sp.Contract):
    def __init__(self):
        self.init_type(t = sp.TRecord(owner = sp.TAddress,
                master_auction_contract = sp.TAddress,
                asset_id = sp.TNat,
                current_bid = sp.TMutez,
                min_increase = sp.TNat,
                highest_bidder = sp.TAddress,
                started = sp.TBool,
                first_bid_placed = sp.TBool,
                ended = sp.TBool,
                start_time = sp.TTimestamp,
                round_time = sp.TInt))
                # round_time (gets refreshed for each bid) 

    @sp.entry_point
    def configureAuction(self, params): 
        sp.verify(sp.sender == self.data.owner)
        sp.verify(~self.data.started)
        sp.verify(~self.data.first_bid_placed)
        sp.verify(~self.data.ended)
        sp.verify(params.start_time > sp.now)

        self.data.current_bid = sp.mutez(params.reserve_price)
        self.data.min_increase = params.min_increase
        self.data.start_time = params.start_time
        self.data.round_time = params.round_time
        
        # configureInstance 
        c = sp.contract(sp.TNat, self.data.master_auction_contract, entry_point = "configureInstance").open_some()
        sp.transfer(self.data.asset_id, sp.mutez(0), c)

    @sp.entry_point
    def startAuction(self, params): 
        sp.verify(sp.sender == self.data.owner)
        sp.verify(~self.data.started)
        sp.verify(~self.data.first_bid_placed)
        sp.verify(~self.data.ended)
        # verify now is less than round_end_time = start_time + round_time
        sp.verify(sp.now < self.data.start_time.add_seconds(self.data.round_time))

        self.data.started = sp.bool(True)
        self.data.start_time = sp.now

        # startedAuction 
        c = sp.contract(sp.TNat, self.data.master_auction_contract, entry_point = "startedAuction").open_some()
        sp.transfer(self.data.asset_id, sp.mutez(0), c)

    @sp.entry_point
    def bid(self, params):
        sp.verify(self.data.started)
        sp.verify(~self.data.ended)
        sp.verify(sp.amount - self.data.current_bid >= sp.mutez(self.data.min_increase))
        sp.verify(~(self.data.highest_bidder == sp.sender))
        # verify an externally owned account and not a contract account 
        sp.verify(sp.sender == sp.source)
        # verify now is less than round_end_time = start_time + round_time
        sp.verify(sp.now < self.data.start_time.add_seconds(self.data.round_time))
        
        sp.if ~self.data.first_bid_placed:
            self.data.first_bid_placed = sp.bool(True)
        sp.else:
            sp.send(self.data.highest_bidder, self.data.current_bid)
        self.data.current_bid = sp.amount
        self.data.highest_bidder = sp.sender
        self.data.start_time = sp.now

    @sp.entry_point
    def resolveAuction(self, params):
        sp.verify(self.data.started)
        sp.verify(self.data.first_bid_placed)
        sp.verify(~self.data.ended)
        sp.verify((sp.sender == self.data.highest_bidder) | (sp.sender == self.data.owner))
        # verify now more than round_end_time = start_time + round_time
        sp.verify(sp.now > self.data.start_time.add_seconds(self.data.round_time))

        # send current_bid to it's bidder (the current owner)
        sp.send(self.data.owner, self.data.current_bid)
        
        self.data.owner = self.data.highest_bidder
        
        # endAuction
        self.endAuction(self.data.asset_id, self.data.owner)

    @sp.entry_point
    def cancelAuction(self, params):
        sp.verify(self.data.started)
        sp.verify(~self.data.ended)
        sp.verify(sp.sender == self.data.owner)

        # verify now is less than round_end_time = start_time + round_time if any bid has been placed
        # otherwise seller can cancel if there are no bids and now > round_end_time
        sp.if self.data.first_bid_placed:
            sp.verify(sp.now < self.data.start_time.add_seconds(self.data.round_time))
        sp.else:
            sp.verify(sp.now > self.data.start_time.add_seconds(self.data.round_time))
            # send current_bid to highest_bidder
            sp.send(self.data.highest_bidder, self.data.current_bid)
        
        self.data.current_bid = sp.mutez(0)
        self.data.highest_bidder = sp.sender
        
        # endAuction
        self.endAuction(self.data.asset_id, self.data.owner)

    def endAuction(self, asset_id, owner):
        self.data.ended = sp.bool(True)

        # destroyInstance 
        c = sp.contract(sp.TRecord(asset_id = sp.TNat, owner = sp.TAddress), self.data.master_auction_contract, entry_point = "destroyInstance").open_some()
        sp.transfer(sp.record(asset_id = asset_id, owner = owner), sp.mutez(0), c)



@sp.add_test(name = "Test Auction")
def test():
    # Create test scenario
    scenario = sp.test_scenario()

    # Create HTML output for debugging
    scenario.h1("English Auction Factory")
    
    # Initialize test accounts
    master = sp.address("tz1-master-address-1234")
    owner = sp.address("tz1-owner-address-1234")

    # Instantiate english auction factory contract
    englishAuctionFactory = EnglishAuctionFactory(master_auction_contract = master, owner = owner)
    scenario += englishAuctionFactory
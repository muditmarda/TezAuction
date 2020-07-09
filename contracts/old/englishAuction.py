import smartpy as sp

class EnglishAuction(sp.Contract):
    def __init__(self, owner, asset_name, reserve_price, min_increase):
        self.init(owner = owner,
                  asset_id = asset_id,
                  current_bid = sp.mutez(reserve_price),
                  min_increase = min_increase,
                  highest_bidder = owner,
                  is_active = sp.bool(True))
                  # wait_time (gets refreshed for each bid) or end_time (after which the auction ends)

    @sp.entry_point
    def bid(self, params):
        sp.verify(self.data.is_active)
        sp.verify(sp.amount - self.data.current_bid >= sp.mutez(self.data.min_increase))
        sp.verify(~(self.data.highest_bidder == sp.sender))
        # verify less than wait_time end_time 
        
        # if owner != highest_bidder then send current_bid to highest_bidder
        sp.if ~(self.data.owner == self.data.highest_bidder) :
            sp.send(self.data.highest_bidder, self.data.current_bid)
        self.data.current_bid = sp.amount
        self.data.highest_bidder = sp.sender

    @sp.entry_point
    def resolveBid(self, params):
        sp.verify(self.data.is_active)
        sp.verify((sp.sender == self.data.highest_bidder) | (sp.sender == self.data.owner))
        # verify more than wait_time end_time 
        
        # send current_bid to owner
        sp.send(self.data.owner, self.data.current_bid)
        self.data.current_bid = sp.mutez(0)
        self.data.is_active = False
        self.data.owner = self.data.highest_bidder

    @sp.entry_point
    def cancelAuction(self, params):
        sp.verify(sp.sender == self.data.owner)
        sp.verify(self.data.is_active)
        # verify less than wait_time end_time 
        
        # send current_bid to highest_bidder
        sp.if ~(self.data.owner == self.data.highest_bidder) :
            sp.send(self.data.highest_bidder, self.data.current_bid)
        self.data.current_bid = sp.mutez(0)
        self.data.highest_bidder = sp.sender
        self.data.is_active = False

    @sp.entry_point
    def restartAuction(self, params):
        sp.verify(sp.sender == self.data.owner)
        sp.verify(~self.data.is_active)
        
        self.data.current_bid = sp.mutez(params.reserve_price)
        self.data.min_increase = params.min_increase
        self.data.highest_bidder = sp.sender
        self.data.is_active = True

    @sp.entry_point
    def transferOwnership(self, params):
        sp.verify(sp.sender == self.data.owner)
        sp.verify(~self.data.is_active)
        
        self.data.owner = params.new_owner

@sp.add_test(name = "Test Auction")
def test():
    scenario = sp.test_scenario()

    # Create HTML output for debugging
    scenario.h1("English Auction")
    
    # Initialize test addresses
    initial_owner = sp.address("tz1-firstOwner-address-1234")
    bidder1 = sp.address("tz1-bidder-address-1111")
    bidder2 = sp.address("tz1-bidder-address-2222")
    bidder3 = sp.address("tz1-bidder-address-3333")
    bidder4 = sp.address("tz1-bidder-address-4444")
    final_owner = sp.address("tz1-secondOwner-address-5678")
    
    # Instantiate EnglishAuction contract
    c1 = EnglishAuction(owner = initial_owner, asset_name = "IdkWhatToSell", reserve_price = 10, min_increase = 3)
    
    # Print contract instance to HTML
    scenario += c1
    # scenario += c1.cancelAuction().run(sender = initial_owner, valid = False)

    # Put bids by bidders and print results to HTML
    scenario.h2("Bid by bidder1")
    scenario += c1.bid().run(sender = bidder1, amount = sp.mutez(13))

    scenario.h2("Bid by bidder2")
    scenario += c1.bid().run(sender = bidder2, amount = sp.mutez(20))
    
    scenario.h2("Bid by bidder2")
    scenario += c1.bid().run(sender = bidder3, amount = sp.mutez(18), valid = False)

    scenario.h2("Attempting resolve bid")
    scenario += c1.resolveBid().run(sender = bidder3, valid = False)

    scenario += c1.resolveBid().run(sender = initial_owner)

    scenario.h2("Restart auction")
    scenario += c1.restartAuction(reserve_price = 50, min_increase = 5).run(sender = bidder2)

    scenario.h2("Bid by bidder3")
    scenario += c1.bid().run(sender = bidder3, amount = sp.mutez(60))

    scenario.h2("Cancel auction")
    scenario += c1.cancelAuction().run(sender = bidder2)

    scenario.h2("Transfer ownership")
    scenario += c1.transferOwnership(new_owner = bidder4).run(sender = bidder2)


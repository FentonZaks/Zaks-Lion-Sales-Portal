# Order Request Workflow
1. Rep creates Draft Order Request.
2. Rep adds items (Individual units, Inners, Master Cases, or Item Groups).
   * Note: Portal displays estimated inventory based on ship-from location.
3. Rep reviews totals (Freight excluded, Taxes estimated visually or deferred).
4. Price Override: Rep changes price -> Must add a mandatory comment.
5. Rep Submits order (Status: Submitted).
6. Order Entry Employee reviews queue (Status: Under Review).
7. Order Entry Employee approves orders for CSV batching.
8. System generates Batch CSV (individual level breakdown for NetSuite).
9. Order Entry Employee inputs NetSuite SO number back into portal.

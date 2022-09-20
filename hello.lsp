; Atoms
(def {nil} {})
(def {true} 1)
(def {false} 0)
; Function Definitions
(def {fun} (\ {f b} {
    def (head f) (\ (tail f) b)
}))
; Unpack List for Function
(fun {unpack f l} {
    eval (join (list f) l)
})
;Pack List for Function
(fun {pack f & xs} {f xs})
; Curried and Uncurried calling
(def {curry} unpack)
(def {uncurry} pack)
; Perform Several things in Sequence
(fun {do & l} {
    if (== l nil)
        {nil}
        {last l}
})
; Open new scope
(fun {let b} {
    ((\ {_} b) ())
})
; Logical Functions
(fun {not x} {- 1 x})
(fun {or x y} {+ x y})
(fun {and x y} {* x y})

(fun {flip f a b} {f b a})
(fun {ghost & xs} {eval xs})
(fun {comp f g x} {f (g x)})


(print 1 2 false)
(print (+ 1 2))
(print "error")
(def {fun} (\ {args body} {def (head args) (\ (tail args) body)}))
(fun {add-together x y} {+ x y})
(print (add-together 10 20))

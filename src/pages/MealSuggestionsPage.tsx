import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../context/useAppState.ts'
import type { Recipe } from '../types/models.ts'
import { hasEnoughWithUnitConversion } from '../domain/rewards/rewardEngine.ts'

const recipes: Recipe[] = [
  { id: 'r1', name: 'Breakfast Spinach Omelette', image: 'https://images.unsplash.com/photo-1510693206972-df098062cb71', timeMinutes: 15, required: [{ name: 'eggs', quantity: 2, unit: 'ea' }, { name: 'spinach', quantity: 100, unit: 'g' }], steps: ['Crack 2 eggs into a bowl and whisk for 30 seconds.', 'Heat a non-stick pan over medium heat and add a little butter.', 'Sauté 100g spinach for 2 minutes until wilted.', 'Pour eggs over spinach and fold gently once set, then serve.'] },
  { id: 'r2', name: 'Breakfast Tomato Egg Scramble', image: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543', timeMinutes: 12, required: [{ name: 'eggs', quantity: 2, unit: 'ea' }, { name: 'tomatoes', quantity: 1, unit: 'ea' }], steps: ['Dice 1 tomato into small cubes.', 'Whisk 2 eggs with a pinch of salt.', 'Sauté tomato over medium heat for 3 minutes until soft.', 'Add eggs and stir continuously for 2-3 minutes until softly set.'] },
  { id: 'r3', name: 'Breakfast Oats Bowl', image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f', timeMinutes: 10, required: [{ name: 'oats', quantity: 80, unit: 'g' }, { name: 'milk', quantity: 300, unit: 'ml' }], steps: ['Add 80g oats and 300ml milk into a saucepan.', 'Bring to a gentle simmer over medium-low heat.', 'Stir for 5 minutes until creamy.', 'Rest for 1 minute and serve warm.'] },
  { id: 'r4', name: 'Breakfast Avocado Toast', image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8', timeMinutes: 10, required: [{ name: 'bread', quantity: 2, unit: 'ea' }, { name: 'avocado', quantity: 1, unit: 'ea' }], steps: ['Toast 2 slices of bread until golden.', 'Mash 1 avocado with a fork and a pinch of salt.', 'Spread avocado evenly over toast.', 'Finish with pepper and lemon juice, then serve immediately.'] },
  { id: 'r5', name: 'Lunch Chicken Tomato Bowl', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c', timeMinutes: 25, required: [{ name: 'chicken', quantity: 300, unit: 'g' }, { name: 'tomatoes', quantity: 2, unit: 'ea' }, { name: 'rice', quantity: 200, unit: 'g' }], steps: ['Cook 200g rice according to package instructions.', 'Slice 300g chicken and season with salt and pepper.', 'Pan-sear chicken over medium-high heat for 6-8 minutes until cooked.', 'Add chopped tomatoes for 3 minutes and serve over rice.'] },
  { id: 'r6', name: 'Lunch Beef Stir Fry', image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19', timeMinutes: 20, required: [{ name: 'beef', quantity: 250, unit: 'g' }, { name: 'broccoli', quantity: 150, unit: 'g' }, { name: 'carrot', quantity: 1, unit: 'ea' }], steps: ['Slice beef thinly against the grain.', 'Cut broccoli into florets and julienne carrot.', 'Stir-fry beef for 3 minutes over high heat.', 'Add vegetables and cook 4 minutes until crisp-tender.'] },
  { id: 'r7', name: 'Lunch Tuna Pasta', image: 'https://images.unsplash.com/photo-1556761223-4c4282c73f77', timeMinutes: 22, required: [{ name: 'pasta', quantity: 250, unit: 'g' }, { name: 'tomatoes', quantity: 1, unit: 'ea' }, { name: 'onion', quantity: 1, unit: 'ea' }], steps: ['Boil 250g pasta in salted water until al dente.', 'Sauté diced onion for 3 minutes until translucent.', 'Add chopped tomato and simmer for 5 minutes.', 'Combine pasta with sauce and toss well before serving.'] },
  { id: 'r8', name: 'Lunch Veggie Rice Bowl', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd', timeMinutes: 20, required: [{ name: 'rice', quantity: 200, unit: 'g' }, { name: 'corn', quantity: 100, unit: 'g' }, { name: 'peas', quantity: 100, unit: 'g' }], steps: ['Cook 200g rice and set aside.', 'Steam peas and corn for 4 minutes.', 'Sauté vegetables with olive oil for 2 minutes.', 'Fold vegetables into rice and season to taste.'] },
  { id: 'r9', name: 'Lunch Lemon Fish Plate', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2', timeMinutes: 25, required: [{ name: 'fish', quantity: 300, unit: 'g' }, { name: 'lemon', quantity: 1, unit: 'ea' }, { name: 'potato', quantity: 2, unit: 'ea' }], steps: ['Slice potatoes and boil for 10 minutes until tender.', 'Season fish and pan-sear 4 minutes each side.', 'Squeeze lemon over fish while still hot.', 'Serve fish with potatoes and a pinch of parsley.'] },
  { id: 'r10', name: 'Lunch Chickpea Salad', image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1', timeMinutes: 12, required: [{ name: 'chickpeas', quantity: 200, unit: 'g' }, { name: 'cucumber', quantity: 1, unit: 'ea' }, { name: 'tomatoes', quantity: 1, unit: 'ea' }], steps: ['Rinse 200g chickpeas and drain well.', 'Dice cucumber and tomato into bite-size pieces.', 'Mix all ingredients in a bowl.', 'Dress with olive oil, lemon juice, salt, and pepper.'] },
  { id: 'r11', name: 'Dinner Creamy Mushroom Pasta', image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601', timeMinutes: 30, required: [{ name: 'pasta', quantity: 250, unit: 'g' }, { name: 'mushroom', quantity: 200, unit: 'g' }, { name: 'milk', quantity: 250, unit: 'ml' }], steps: ['Cook pasta to al dente and reserve some pasta water.', 'Sauté mushrooms in butter for 5 minutes until browned.', 'Add milk and simmer for 4 minutes to form a light sauce.', 'Toss pasta into sauce and adjust consistency with pasta water.'] },
  { id: 'r12', name: 'Dinner Chicken Broccoli Stir Fry', image: 'https://images.unsplash.com/photo-1604908176997-431f6a5f08a9', timeMinutes: 24, required: [{ name: 'chicken', quantity: 300, unit: 'g' }, { name: 'broccoli', quantity: 200, unit: 'g' }, { name: 'garlic', quantity: 2, unit: 'ea' }], steps: ['Slice chicken into thin strips.', 'Mince garlic and cut broccoli florets.', 'Cook chicken over high heat for 6 minutes.', 'Add garlic and broccoli; stir-fry 4 more minutes and serve.'] },
  { id: 'r13', name: 'Dinner Beef Tomato Pasta', image: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9', timeMinutes: 28, required: [{ name: 'beef', quantity: 250, unit: 'g' }, { name: 'pasta', quantity: 250, unit: 'g' }, { name: 'tomatoes', quantity: 2, unit: 'ea' }], steps: ['Boil pasta in salted water.', 'Brown beef in a hot pan for 5 minutes.', 'Add diced tomatoes and simmer 6 minutes.', 'Combine with pasta and finish with pepper.'] },
  { id: 'r14', name: 'Dinner Tofu Veggie Bowl', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd', timeMinutes: 22, required: [{ name: 'tofu', quantity: 250, unit: 'g' }, { name: 'capsicum', quantity: 1, unit: 'ea' }, { name: 'zucchini', quantity: 1, unit: 'ea' }], steps: ['Press tofu and cube into bite-size pieces.', 'Pan-sear tofu for 5 minutes until lightly crisp.', 'Sauté sliced capsicum and zucchini for 4 minutes.', 'Combine tofu and vegetables and season before serving.'] },
  { id: 'r15', name: 'Dinner Shrimp Garlic Rice', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8', timeMinutes: 20, required: [{ name: 'shrimp', quantity: 250, unit: 'g' }, { name: 'garlic', quantity: 2, unit: 'ea' }, { name: 'rice', quantity: 200, unit: 'g' }], steps: ['Cook rice and keep warm.', 'Sauté minced garlic for 30 seconds.', 'Add shrimp and cook for 3-4 minutes until pink.', 'Fold shrimp into rice and serve immediately.'] },
  { id: 'r16', name: 'Dinner Veggie Soup', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd', timeMinutes: 30, required: [{ name: 'carrot', quantity: 1, unit: 'ea' }, { name: 'celery', quantity: 1, unit: 'ea' }, { name: 'onion', quantity: 1, unit: 'ea' }], steps: ['Dice carrot, celery, and onion.', 'Sauté onion for 3 minutes in olive oil.', 'Add remaining vegetables with water and simmer 20 minutes.', 'Season with salt and pepper, then serve hot.'] },
  { id: 'r17', name: 'Dinner Baked Potato Plate', image: 'https://images.unsplash.com/photo-1603046891744-73f165aa69e0', timeMinutes: 35, required: [{ name: 'potato', quantity: 3, unit: 'ea' }, { name: 'butter', quantity: 20, unit: 'g' }, { name: 'parsley', quantity: 10, unit: 'g' }], steps: ['Preheat oven to 200°C.', 'Pierce potatoes and bake for 30 minutes.', 'Slice open and add butter while hot.', 'Top with chopped parsley and a pinch of salt.'] },
  { id: 'r18', name: 'Dinner Fish Tomato Stew', image: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b', timeMinutes: 26, required: [{ name: 'fish', quantity: 300, unit: 'g' }, { name: 'tomatoes', quantity: 2, unit: 'ea' }, { name: 'garlic', quantity: 1, unit: 'ea' }], steps: ['Sauté garlic for 30 seconds.', 'Add chopped tomatoes and simmer 8 minutes.', 'Add fish chunks and cook gently for 8 minutes.', 'Finish with pepper and serve with bread.'] },
  { id: 'r19', name: 'Lunch Broccoli Pasta', image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601', timeMinutes: 18, required: [{ name: 'pasta', quantity: 200, unit: 'g' }, { name: 'broccoli', quantity: 150, unit: 'g' }, { name: 'olive oil', quantity: 20, unit: 'ml' }], steps: ['Boil pasta to al dente.', 'Blanch broccoli for 2 minutes.', 'Sauté broccoli with olive oil and garlic.', 'Toss with pasta and season.'] },
  { id: 'r20', name: 'Lunch Tofu Rice', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd', timeMinutes: 20, required: [{ name: 'tofu', quantity: 200, unit: 'g' }, { name: 'rice', quantity: 200, unit: 'g' }, { name: 'onion', quantity: 1, unit: 'ea' }], steps: ['Cook rice and set aside.', 'Sauté onion until translucent.', 'Add tofu cubes and cook until golden.', 'Serve tofu-onion mix over rice.'] },
  { id: 'r21', name: 'Breakfast Yogurt Oats Cup', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777', timeMinutes: 8, required: [{ name: 'yogurt', quantity: 200, unit: 'ml' }, { name: 'oats', quantity: 50, unit: 'g' }, { name: 'mango', quantity: 1, unit: 'ea' }], steps: ['Add oats to a serving bowl.', 'Top with yogurt and mix lightly.', 'Dice mango and scatter over the top.', 'Rest 2 minutes before eating.'] },
  { id: 'r22', name: 'Dinner Pork Veggie Pan', image: 'https://images.unsplash.com/photo-1544025162-d76694265947', timeMinutes: 26, required: [{ name: 'pork', quantity: 250, unit: 'g' }, { name: 'capsicum', quantity: 1, unit: 'ea' }, { name: 'onion', quantity: 1, unit: 'ea' }], steps: ['Slice pork and vegetables thinly.', 'Sear pork over medium-high heat for 5 minutes.', 'Add vegetables and stir-fry for 4 minutes.', 'Season and rest for 2 minutes before serving.'] },
  { id: 'r23', name: 'Lunch Egg Fried Rice', image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f', timeMinutes: 16, required: [{ name: 'rice', quantity: 220, unit: 'g' }, { name: 'eggs', quantity: 2, unit: 'ea' }, { name: 'peas', quantity: 80, unit: 'g' }], steps: ['Scramble eggs and set aside.', 'Stir-fry peas for 2 minutes.', 'Add cooked rice and fry for 3 minutes.', 'Return eggs, season, and mix thoroughly.'] },
  { id: 'r24', name: 'Dinner Cauliflower Mash Plate', image: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327', timeMinutes: 22, required: [{ name: 'cauliflower', quantity: 300, unit: 'g' }, { name: 'butter', quantity: 20, unit: 'g' }, { name: 'garlic', quantity: 1, unit: 'ea' }], steps: ['Steam cauliflower until very tender.', 'Sauté garlic in butter for 1 minute.', 'Blend cauliflower with butter mixture.', 'Season with salt and pepper and serve.'] },
  { id: 'r25', name: 'Dinner Eggplant Tomato Skillet', image: 'https://images.unsplash.com/photo-1604908554027-4b4ecf7dbb3a', timeMinutes: 25, required: [{ name: 'eggplant', quantity: 1, unit: 'ea' }, { name: 'tomatoes', quantity: 2, unit: 'ea' }, { name: 'olive oil', quantity: 20, unit: 'ml' }], steps: ['Dice eggplant and tomato.', 'Sauté eggplant in olive oil for 6 minutes.', 'Add tomato and cook until softened.', 'Simmer 5 minutes, season, and serve.'] },
  { id: 'r26', name: 'Lunch Cucumber Tomato Sandwich', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af', timeMinutes: 8, required: [{ name: 'bread', quantity: 2, unit: 'ea' }, { name: 'cucumber', quantity: 1, unit: 'ea' }, { name: 'tomatoes', quantity: 1, unit: 'ea' }], steps: ['Slice cucumber and tomato thinly.', 'Toast bread lightly.', 'Layer vegetables between bread slices.', 'Cut in half and serve.'] },
  { id: 'r27', name: 'Dinner Garlic Butter Shrimp', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8', timeMinutes: 14, required: [{ name: 'shrimp', quantity: 220, unit: 'g' }, { name: 'garlic', quantity: 2, unit: 'ea' }, { name: 'butter', quantity: 20, unit: 'g' }], steps: ['Mince garlic and pat shrimp dry.', 'Melt butter over medium heat.', 'Cook garlic for 30 seconds, then add shrimp.', 'Cook 3-4 minutes until pink and serve hot.'] },
  { id: 'r28', name: 'Lunch Bean Salad Bowl', image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1', timeMinutes: 10, required: [{ name: 'beans', quantity: 200, unit: 'g' }, { name: 'onion', quantity: 1, unit: 'ea' }, { name: 'parsley', quantity: 10, unit: 'g' }], steps: ['Rinse beans and drain well.', 'Finely chop onion and parsley.', 'Combine all ingredients in a bowl.', 'Dress with olive oil and lemon, then toss.'] },
  { id: 'r29', name: 'Breakfast Savoury Toast', image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8', timeMinutes: 9, required: [{ name: 'bread', quantity: 2, unit: 'ea' }, { name: 'butter', quantity: 10, unit: 'g' }, { name: 'tomatoes', quantity: 1, unit: 'ea' }], steps: ['Toast bread slices until crisp.', 'Spread butter while warm.', 'Top with thin tomato slices.', 'Sprinkle salt and pepper before serving.'] },
  { id: 'r30', name: 'Dinner Chicken Rice Soup', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd', timeMinutes: 30, required: [{ name: 'chicken', quantity: 250, unit: 'g' }, { name: 'rice', quantity: 100, unit: 'g' }, { name: 'carrot', quantity: 1, unit: 'ea' }], steps: ['Dice chicken and carrot.', 'Sauté chicken for 4 minutes.', 'Add rice, carrot, and water; simmer 20 minutes.', 'Adjust seasoning and serve hot.'] },
  { id: 'r31', name: 'Lunch Zucchini Pasta', image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601', timeMinutes: 20, required: [{ name: 'pasta', quantity: 220, unit: 'g' }, { name: 'zucchini', quantity: 1, unit: 'ea' }, { name: 'garlic', quantity: 1, unit: 'ea' }], steps: ['Cook pasta until al dente.', 'Slice zucchini into thin half-moons.', 'Sauté garlic and zucchini for 4 minutes.', 'Toss pasta with zucchini mixture and serve.'] },
  { id: 'r32', name: 'Dinner Beef Potato Skillet', image: 'https://images.unsplash.com/photo-1544025162-d76694265947', timeMinutes: 27, required: [{ name: 'beef', quantity: 250, unit: 'g' }, { name: 'potato', quantity: 2, unit: 'ea' }, { name: 'onion', quantity: 1, unit: 'ea' }], steps: ['Parboil potatoes for 8 minutes and drain.', 'Brown beef in a skillet for 5 minutes.', 'Add sliced onion and potatoes.', 'Cook 8 more minutes until potatoes are crisp and beef is done.'] },
  { id: 'r33', name: 'Creamy Banana Oats', image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f', timeMinutes: 9, required: [{ name: 'banana', quantity: 1, unit: 'ea' }, { name: 'oats', quantity: 60, unit: 'g' }, { name: 'milk', quantity: 250, unit: 'ml' }], steps: ['Slice banana into thin coins.', 'Simmer oats and milk for 5 minutes.', 'Stir in half the banana while hot.', 'Top with remaining banana and serve.'] },
  { id: 'r34', name: 'Avocado Egg Bowl', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061', timeMinutes: 14, required: [{ name: 'avocado', quantity: 1, unit: 'ea' }, { name: 'eggs', quantity: 2, unit: 'ea' }, { name: 'bread', quantity: 1, unit: 'ea' }], steps: ['Soft boil eggs for 7 minutes.', 'Toast bread and cut into cubes.', 'Mash avocado and fold through toast cubes.', 'Top with peeled eggs and season lightly.'] },
  { id: 'r35', name: 'Chicken Avocado Wrap Bowl', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd', timeMinutes: 18, required: [{ name: 'chicken', quantity: 200, unit: 'g' }, { name: 'avocado', quantity: 1, unit: 'ea' }, { name: 'lettuce', quantity: 80, unit: 'g' }], steps: ['Sear chicken strips for 6 minutes.', 'Slice avocado and shred lettuce.', 'Rest chicken then slice thinly.', 'Layer everything in a bowl and serve.'] },
  { id: 'r36', name: 'Fish & Broccoli Plate', image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2', timeMinutes: 22, required: [{ name: 'fish', quantity: 250, unit: 'g' }, { name: 'broccoli', quantity: 180, unit: 'g' }, { name: 'lemon', quantity: 1, unit: 'ea' }], steps: ['Steam broccoli for 4 minutes.', 'Pan sear fish 4 minutes each side.', 'Finish fish with lemon juice.', 'Serve fish with steamed broccoli.'] },
  { id: 'r37', name: 'Silky Herb Omelette', image: 'https://images.unsplash.com/photo-1510693206972-df098062cb71', timeMinutes: 12, required: [{ name: 'eggs', quantity: 3, unit: 'ea' }, { name: 'parsley', quantity: 10, unit: 'g' }], steps: ['Beat eggs until smooth.', 'Heat pan with butter.', 'Cook eggs over low heat while stirring.', 'Fold with parsley and plate.'] },
  { id: 'r38', name: 'Egg & Mushroom Toast', image: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543', timeMinutes: 14, required: [{ name: 'eggs', quantity: 2, unit: 'ea' }, { name: 'mushroom', quantity: 120, unit: 'g' }, { name: 'bread', quantity: 1, unit: 'ea' }], steps: ['Toast bread until crisp.', 'Sauté mushrooms until golden.', 'Scramble eggs softly.', 'Top toast with eggs and mushrooms.'] },
  { id: 'r39', name: 'Egg Fried Veg Bowl', image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f', timeMinutes: 18, required: [{ name: 'eggs', quantity: 2, unit: 'ea' }, { name: 'rice', quantity: 180, unit: 'g' }, { name: 'corn', quantity: 80, unit: 'g' }], steps: ['Scramble eggs first and set aside.', 'Stir-fry corn briefly.', 'Add rice and toss over high heat.', 'Return eggs and season.'] },
  { id: 'r40', name: 'Egg Tomato Rice', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061', timeMinutes: 16, required: [{ name: 'eggs', quantity: 2, unit: 'ea' }, { name: 'tomatoes', quantity: 1, unit: 'ea' }, { name: 'rice', quantity: 180, unit: 'g' }], steps: ['Dice tomato and whisk eggs.', 'Cook eggs then remove.', 'Simmer tomato 3 minutes.', 'Add rice and eggs, stir together.'] },
  { id: 'r41', name: 'Baked Egg Cups', image: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543', timeMinutes: 20, required: [{ name: 'eggs', quantity: 3, unit: 'ea' }, { name: 'spinach', quantity: 80, unit: 'g' }], steps: ['Preheat oven to 180°C.', 'Grease muffin tray and add spinach.', 'Crack eggs into cups.', 'Bake 12-14 minutes until set.'] },
  { id: 'r42', name: 'Chicken Garlic Pasta', image: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601', timeMinutes: 24, required: [{ name: 'chicken', quantity: 250, unit: 'g' }, { name: 'pasta', quantity: 220, unit: 'g' }, { name: 'garlic', quantity: 2, unit: 'ea' }], steps: ['Boil pasta until al dente.', 'Sauté garlic with sliced chicken.', 'Cook chicken through, 7 minutes.', 'Toss with pasta and serve.'] },
  { id: 'r43', name: 'Chicken Veg Soup', image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd', timeMinutes: 28, required: [{ name: 'chicken', quantity: 220, unit: 'g' }, { name: 'carrot', quantity: 1, unit: 'ea' }, { name: 'onion', quantity: 1, unit: 'ea' }], steps: ['Dice all ingredients.', 'Sauté onion and chicken briefly.', 'Add water and carrot.', 'Simmer 20 minutes and season.'] },
  { id: 'r44', name: 'Chicken Lettuce Bowl', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd', timeMinutes: 18, required: [{ name: 'chicken', quantity: 220, unit: 'g' }, { name: 'lettuce', quantity: 100, unit: 'g' }, { name: 'cucumber', quantity: 1, unit: 'ea' }], steps: ['Sear chicken strips until cooked.', 'Chop lettuce and cucumber.', 'Slice cooked chicken thinly.', 'Assemble bowl and serve.'] },
  { id: 'r45', name: 'Chicken Tomato Stir Fry', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c', timeMinutes: 20, required: [{ name: 'chicken', quantity: 240, unit: 'g' }, { name: 'tomatoes', quantity: 2, unit: 'ea' }, { name: 'onion', quantity: 1, unit: 'ea' }], steps: ['Slice chicken and onion.', 'Cook chicken over high heat.', 'Add onion and tomato wedges.', 'Stir-fry until tomatoes soften.'] },
  { id: 'r46', name: 'Chicken Broccoli Rice', image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f', timeMinutes: 26, required: [{ name: 'chicken', quantity: 260, unit: 'g' }, { name: 'broccoli', quantity: 160, unit: 'g' }, { name: 'rice', quantity: 200, unit: 'g' }], steps: ['Cook rice and keep warm.', 'Sear chicken strips 6 minutes.', 'Steam broccoli 4 minutes.', 'Mix all together and season.'] },
]

const recipeMealType = (name: string): 'breakfast' | 'lunch' | 'dinner' => {
  const n = name.toLowerCase()
  if (n.includes('breakfast') || n.includes('omelette') || n.includes('toast') || n.includes('oats')) return 'breakfast'
  if (n.includes('lunch') || n.includes('salad') || n.includes('bowl') || n.includes('sandwich')) return 'lunch'
  return 'dinner'
}

export function MealSuggestionsPage() {
  const navigate = useNavigate()
  const { setSelectedRecipe, inventory, user } = useAppState()
  const [mealType, setMealType] = useState<'all' | 'breakfast' | 'lunch' | 'dinner'>('all')
  const [prioritizeExpiring, setPrioritizeExpiring] = useState(false)

  const missingIngredients = (recipe: Recipe) => recipe.required.filter((req) => {
    const item = inventory.find((x) => x.name.toLowerCase() === req.name.toLowerCase())
    return !item || !hasEnoughWithUnitConversion(item, req.quantity, req.unit)
  })

  const canMake = (recipe: Recipe) => missingIngredients(recipe).length === 0
  const missingCount = (recipe: Recipe) => missingIngredients(recipe).length

  const redUrgentNames = new Set(
    inventory
      .filter((item) => {
        const diff = Math.ceil((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        return diff <= 3
      })
      .map((x) => x.name.toLowerCase()),
  )

  const filtered = useMemo(() => {
    const base = recipes.filter(canMake)
    const typed = mealType === 'all' ? base : base.filter((r) => recipeMealType(r.name) === mealType)
    if (!prioritizeExpiring) return typed
    const urgentOnly = typed.filter((r) => r.required.some((req) => redUrgentNames.has(req.name.toLowerCase())))
    return [...urgentOnly].sort((a, b) => a.required.length - b.required.length)
  }, [inventory, mealType, prioritizeExpiring])

  const fallbackRecipes = useMemo(() => {
    const close = recipes.filter((r) => {
      const missing = missingCount(r)
      return missing >= 1 && missing <= 2
    }).sort((a, b) => missingCount(a) - missingCount(b))
    return mealType === 'all' ? close : close.filter((r) => recipeMealType(r.name) === mealType)
  }, [inventory, mealType])

  const displayName = (name: string) => name.replace(/^Breakfast\s+|^Lunch\s+|^Dinner\s+/i, '')

  return (
    <section className="space-y-6">
      <div className="glass-card p-8">
        <h1 className="hero-title text-5xl font-semibold">Hi {user.nickname || 'there'}, let's cook something delicious!</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select className="rounded-xl border border-slate-300 bg-white px-3 py-2" value={mealType} onChange={(e) => setMealType(e.target.value as typeof mealType)}>
            <option value="all">All</option><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option>
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prioritizeExpiring} onChange={(e) => setPrioritizeExpiring(e.target.checked)} /> Priotise Expiring Ingredients</label>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((recipe) => (
          <article key={recipe.id} className="glass-card overflow-hidden">
            <img src={`${recipe.image}?auto=format&fit=crop&w=1000&q=80`} alt={recipe.name} className="h-40 w-full object-cover" />
            <div className="p-6">
              <h2 className="text-2xl font-semibold">{displayName(recipe.name)}</h2>
              <p className="mt-1 text-slate-600">{recipe.timeMinutes} minutes • Low-waste recommendation</p>
              <button className="mt-4 rounded-full bg-emerald-600 px-5 py-2 text-white" onClick={() => { setSelectedRecipe(recipe); navigate('/cooking-guide') }}>Start cooking</button>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-slate-700">Here are recipes you can make with just a few extra ingredients.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {fallbackRecipes.map((recipe) => (
                <div key={recipe.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="font-semibold">{displayName(recipe.name)}</p>
                  <p className="text-sm text-slate-600">Missing: {missingIngredients(recipe).map((m) => `${m.quantity}${m.unit} ${m.name}`).join(', ')}</p>
                </div>
              ))}
              {fallbackRecipes.length === 0 && <p className="text-slate-600">No close-match recipes yet.</p>}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

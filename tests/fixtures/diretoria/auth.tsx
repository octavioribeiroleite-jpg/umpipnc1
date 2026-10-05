/* eslint-disable @typescript-eslint/no-explicit-any -- Local-only double spans heterogeneous Supabase query shapes. */
import {useState,createContext,useContext} from 'react';
const Context=createContext<any>(null);
export const testUserId='00000000-0000-0000-0000-000000000001';
export const testSocietyId='00000000-0000-0000-0000-000000000002';
export function AuthProvider({children}:any){
 const [selectedSocietyId,setSelectedSocietyId]=useState<string|null>(null);
 const role=new URLSearchParams(location.search).get('role')||'admin';
 const society={id:testSocietyId,name:'União de Jovens — Exemplo',slug:'ump',color:'#1c8053'};
 const value={user:{id:testUserId,email:'revisao@example.test'},session:null,profile:{id:'profile',user_id:testUserId,full_name:'Maria Oliveira — Revisão',email:'revisao@example.test',username:'revisao',active:true,society_id:testSocietyId},roles:[role],loading:false,rolesLoaded:true,isAdmin:role==='admin',isManagement:role==='admin'||role==='diretoria',isPastor:false,society,selectedSocietyId,setSelectedSocietyId,effectiveSocietyId:role==='admin'?selectedSocietyId:testSocietyId,signOut:async()=>{location.href='/__diretoria/auth'},signIn:async()=>({error:null})};
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);
